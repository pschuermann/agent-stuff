#!/usr/bin/env -S uv run python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["Pillow"]
# ///
"""
extract_visual_insights — local/free YouTube visual crop extraction.

Extracts frames from YouTube videos, crops them, aligns with captions,
skips SponsorBlock segments, and emits a Markdown report + JSON manifest.

No API keys required. Uses yt-dlp + ffmpeg CLIs, SponsorBlock public API,
and Pillow for cropping. All processing is local/free by default.

Usage:
    uv run scripts/extract_visual_insights.py <url> [options]

Default output:
    <output-dir>/
        report.md          # Markdown report with crops and transcript snippets
        manifest.json      # Structured JSON with all metadata
        crops/             # Selected crop images only
        debug/             # (only with --debug) raw frames, captions, SB JSON
"""

import argparse
import json
import math
import random
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from string import ascii_lowercase, digits

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SPONSORBLOCK_API = "https://sponsor.ajay.app/api/skipSegments"
DEFAULT_SB_CATEGORIES = "sponsor,selfpromo,interaction,intro,outro"
DEFAULT_QUALITY = "high"
QUALITY_FORMAT_SELECTORS = {
    # Fast/disk-friendly, preserving the previous bounded-quality behavior.
    "fast": "bv*[height<=720]+ba/b[height<=720]/best[height<=720]/best",
    # Better crop source frames while still bounding downloads and seeks.
    "high": "bv*[height<=1080]+ba/b[height<=1080]/best[height<=1080]/best",
    # Highest available video stream. May be slower and use more disk.
    "max": "bv*+ba/bestvideo+bestaudio/best",
}
DEFAULT_MAX_CANDIDATES = 160
DEFAULT_MAX_KEPT = 12
DEFAULT_TRANSCRIPT_WINDOW = 5
MIN_CROP_SCORE = 18.0
DEDUP_HASH_DISTANCE = 7
FRAME_TIMEOUT = 60  # seconds per ffmpeg frame extraction
YTDLP_TIMEOUT = 120  # seconds for yt-dlp operations


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def eprint(*args, **kwargs):
    """Print to stderr."""
    print(*args, file=sys.stderr, **kwargs)


def check_tool(name):
    """Check if a CLI tool is available. Print install hint if not."""
    if shutil.which(name) is None:
        eprint(f"ERROR: '{name}' not found on PATH.")
        if name == "yt-dlp":
            eprint("Install: pip install yt-dlp  or  brew install yt-dlp")
        elif name == "ffmpeg":
            eprint("Install: brew install ffmpeg")
        sys.exit(1)


def fmt_timestamp(seconds):
    """Format seconds as HH:MM:SS."""
    seconds = float(seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def fmt_timestamp_compact(seconds):
    """Format seconds as a filename-safe timestamp."""
    seconds = float(seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds - int(seconds)) * 1000))
    if h:
        return f"{h:02d}h{m:02d}m{s:02d}s{ms:03d}ms"
    return f"{m:02d}m{s:02d}s{ms:03d}ms"


def rand_suffix(length=6):
    """Generate a short random suffix."""
    return "".join(random.choices(ascii_lowercase + digits, k=length))


def compact_transcript(segments):
    """Join overlapping caption segments into readable prose.

    YouTube captions often repeat words across adjacent SRT segments. The visual
    report should show the nearby transcript once, not stutter repeated phrases.
    """
    merged_words = []
    for seg in segments or []:
        text = re.sub(r"\s+", " ", str(seg.get("text", "")).strip())
        if not text:
            continue
        words = text.split()
        if not words:
            continue
        if not merged_words:
            merged_words.extend(words)
            continue
        max_k = min(len(merged_words), len(words), 80)
        merged_lower = [w.lower() for w in merged_words[-max_k:]]
        words_lower = [w.lower() for w in words[:max_k]]
        overlap = 0
        for k in range(max_k, 0, -1):
            if merged_lower[-k:] == words_lower[:k]:
                overlap = k
                break
        recent = " ".join(w.lower() for w in merged_words[-120:])
        candidate = " ".join(w.lower() for w in words)
        if overlap == 0 and candidate in recent:
            continue
        merged_words.extend(words[overlap:])
    return re.sub(r"\s+", " ", " ".join(merged_words)).strip()


def pil_lanczos():
    """Return Pillow's LANCZOS resampling constant without deprecation warnings."""
    from PIL import Image
    if hasattr(Image, "Resampling"):
        return Image.Resampling.LANCZOS
    return getattr(Image, "LANCZOS", 1)


def pil_pixels(img):
    """Return image pixels using Pillow's non-deprecated API when available."""
    get_flattened_data = getattr(img, "get_flattened_data", None)
    if get_flattened_data is not None:
        return list(get_flattened_data())
    return list(img.getdata())


def parse_timestamp(value):
    """Parse seconds, MM:SS, or HH:MM:SS into seconds."""
    value = value.strip()
    if not value:
        raise ValueError("empty timestamp")
    if ":" not in value:
        return float(value)
    parts = [float(p) for p in value.split(":")]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    raise ValueError(f"invalid timestamp: {value}")


def resolve_format_selector(quality, format_override=None):
    """Return the effective yt-dlp format selector for a quality mode."""
    if format_override:
        return format_override
    return QUALITY_FORMAT_SELECTORS[quality]


def _selected_video_format_info(meta):
    """Extract selected video stream dimensions/format info from yt-dlp JSON."""
    video_format = None
    requested_formats = meta.get("requested_formats") or []
    for fmt in requested_formats:
        if fmt.get("vcodec") and fmt.get("vcodec") != "none":
            video_format = fmt
            break

    if video_format is None and (meta.get("vcodec") != "none" or meta.get("width") or meta.get("height")):
        video_format = meta

    if video_format is None:
        return None

    return {
        "format_id": video_format.get("format_id"),
        "format_note": video_format.get("format_note"),
        "ext": video_format.get("ext"),
        "width": video_format.get("width"),
        "height": video_format.get("height"),
        "resolution": video_format.get("resolution"),
        "fps": video_format.get("fps"),
        "vcodec": video_format.get("vcodec"),
    }


# ---------------------------------------------------------------------------
# Stage 1: Video ID extraction
# ---------------------------------------------------------------------------

def extract_video_id(url):
    """Extract YouTube video ID from various URL formats or raw IDs.

    Handles:
        - youtube.com/watch?v=VIDEO_ID
        - youtu.be/VIDEO_ID
        - youtube.com/shorts/VIDEO_ID
        - youtube.com/embed/VIDEO_ID
        - youtube.com/v/VIDEO_ID
        - Raw 11-character video IDs
    """
    url = url.strip()

    # Raw video ID (11 alphanumeric + _ + -)
    if re.match(r"^[A-Za-z0-9_-]{11}$", url):
        return url

    # youtube.com/watch?v=...
    m = re.search(r"youtube\.com/watch\?.*v=([A-Za-z0-9_-]{11})", url)
    if m:
        return m.group(1)

    # youtu.be/VIDEO_ID
    m = re.search(r"youtu\.be/([A-Za-z0-9_-]{11})", url)
    if m:
        return m.group(1)

    # youtube.com/shorts/VIDEO_ID
    m = re.search(r"youtube\.com/shorts/([A-Za-z0-9_-]{11})", url)
    if m:
        return m.group(1)

    # youtube.com/embed/VIDEO_ID
    m = re.search(r"youtube\.com/embed/([A-Za-z0-9_-]{11})", url)
    if m:
        return m.group(1)

    # youtube.com/v/VIDEO_ID
    m = re.search(r"youtube\.com/v/([A-Za-z0-9_-]{11})", url)
    if m:
        return m.group(1)

    eprint(f"ERROR: Could not extract video ID from URL: {url}")
    eprint("Expected formats: youtube.com/watch?v=ID, youtu.be/ID, or raw 11-char ID")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Stage 2: Metadata
# ---------------------------------------------------------------------------

def fetch_metadata(video_id, format_selector):
    """Fetch video metadata via yt-dlp --dump-json.

    Returns dict with video metadata plus selected source video format info.
    """
    check_tool("yt-dlp")
    url = f"https://www.youtube.com/watch?v={video_id}"

    eprint(f"[1/9] Fetching metadata for {video_id}...")
    try:
        result = subprocess.run(
            ["yt-dlp", "--dump-json", "--skip-download",
             "-f", format_selector,
             "--no-playlist", "--no-warnings",
             url],
            capture_output=True, text=True, timeout=YTDLP_TIMEOUT
        )
    except subprocess.TimeoutExpired:
        eprint("ERROR: yt-dlp timed out fetching metadata")
        sys.exit(1)

    if result.returncode != 0:
        stderr = result.stderr.strip()
        if "Video unavailable" in stderr or "Private video" in stderr:
            eprint(f"ERROR: Video unavailable or private: {video_id}")
        elif "HTTP Error 404" in stderr:
            eprint(f"ERROR: Video not found (404): {video_id}")
        else:
            eprint(f"ERROR: yt-dlp failed: {stderr[:500]}")
        sys.exit(1)

    try:
        meta = json.loads(result.stdout)
    except json.JSONDecodeError as e:
        eprint(f"ERROR: Could not parse yt-dlp JSON output: {e}")
        sys.exit(1)

    duration = meta.get("duration") or 0
    eprint(f"  Title: {meta.get('title', 'Unknown')}")
    eprint(f"  Duration: {fmt_timestamp(duration)} ({duration}s)")
    eprint(f"  Uploader: {meta.get('uploader', 'Unknown')}")
    source_video = _selected_video_format_info(meta)
    if source_video and (source_video.get("width") or source_video.get("height")):
        eprint(f"  Selected video: {source_video.get('width') or '?'}x{source_video.get('height') or '?'}")

    return {
        "video_id": video_id,
        "title": meta.get("title", "Unknown"),
        "duration": duration,
        "uploader": meta.get("uploader", "Unknown"),
        "webpage_url": meta.get("webpage_url", url),
        "language": meta.get("language") or "unknown",
        "source_video": source_video,
    }


# ---------------------------------------------------------------------------
# Stage 3: SponsorBlock
# ---------------------------------------------------------------------------

def _write_debug_json(output_dir, filename, payload):
    """Write a JSON debug artifact when debug mode is enabled."""
    debug_dir = output_dir / "debug"
    debug_dir.mkdir(parents=True, exist_ok=True)
    (debug_dir / filename).write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def fetch_sponsorblock(video_id, categories_str, skip, output_dir=None, debug=False):
    """Query SponsorBlock API for skip segments.

    Returns (segments, skipped_categories):
        segments: list of {"start": float, "end": float, "category": str}
        skipped_categories: list of category strings that were filtered
    """
    if skip:
        eprint("[2/9] SponsorBlock: skipped (--skip-sponsorblock)")
        if debug and output_dir:
            _write_debug_json(output_dir, "sponsorblock.json", {"skipped": True, "segments": []})
        return [], []

    skipped_categories = [c.strip() for c in categories_str.split(",") if c.strip()]
    query = urllib.parse.urlencode({
        "videoID": video_id,
        "categories": json.dumps(skipped_categories, separators=(",", ":")),
    })
    url = f"{SPONSORBLOCK_API}?{query}"
    eprint(f"[2/9] Querying SponsorBlock API...")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "yt-visual-insights/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            eprint("  No SponsorBlock segments found for this video.")
            if debug and output_dir:
                _write_debug_json(output_dir, "sponsorblock.json", [])
        else:
            eprint(f"  SponsorBlock API returned HTTP {e.code}, proceeding unfiltered.")
            if debug and output_dir:
                _write_debug_json(output_dir, "sponsorblock.json", {"error": f"HTTP {e.code}", "segments": []})
        return [], skipped_categories
    except (urllib.error.URLError, json.JSONDecodeError, OSError) as e:
        eprint(f"  SponsorBlock API error: {e}. Proceeding unfiltered.")
        if debug and output_dir:
            _write_debug_json(output_dir, "sponsorblock.json", {"error": str(e), "segments": []})
        return [], skipped_categories

    if debug and output_dir:
        _write_debug_json(output_dir, "sponsorblock.json", raw)

    segments = []
    for seg in raw:
        seg_start, seg_end = seg.get("segment", [0, 0])
        category = seg.get("category", "unknown")
        segments.append({
            "start": float(seg_start),
            "end": float(seg_end),
            "category": category,
        })

    eprint(f"  Found {len(segments)} segment(s) to skip across {len(skipped_categories)} categories")
    return segments, skipped_categories


# ---------------------------------------------------------------------------
# Stage 4: Captions
# ---------------------------------------------------------------------------

def _list_subs(video_id):
    """List available subtitle tracks via yt-dlp --list-subs."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        result = subprocess.run(
            ["yt-dlp", "--list-subs", "--skip-download",
             "--no-playlist", "--no-warnings", url],
            capture_output=True, text=True, timeout=YTDLP_TIMEOUT
        )
    except subprocess.TimeoutExpired:
        return []
    return result.stdout


def _pick_best_lang(subs_output, requested_lang):
    """Parse yt-dlp --list-subs output and pick the best language track.

    Prefers manual subs over auto, requested language over others.
    Returns language code string or None.
    """
    languages = set()
    manual_langs = set()
    auto_langs = set()

    in_auto = False
    for line in subs_output.splitlines():
        if "Available automatic captions" in line or "has no automatic captions" in line:
            in_auto = True
            continue
        if "Available subtitles" in line or "has no subtitles" in line:
            in_auto = False
            continue
        # Language lines look like: "en" or "en English" or "en (English)"
        m = re.match(r"^\s*([a-z]{2,3}(?:-[A-Za-z]+)?)\b", line)
        if m:
            lang = m.group(1)
            languages.add(lang)
            if in_auto:
                auto_langs.add(lang)
            else:
                manual_langs.add(lang)

    if not languages:
        return None

    if requested_lang and requested_lang != "auto":
        # Exact match in manual
        if requested_lang in manual_langs:
            return requested_lang
        # Exact match in auto
        if requested_lang in auto_langs:
            return requested_lang
        # Prefix match (e.g., "en" matches "en-US")
        for lang in manual_langs:
            if lang.startswith(requested_lang):
                return lang
        for lang in auto_langs:
            if lang.startswith(requested_lang):
                return lang

    # Fallback: prefer manual, then any
    preferred = ["en"]  # English is preferred fallback
    for pref in preferred:
        if pref in manual_langs:
            return pref
        for lang in manual_langs:
            if lang.startswith(pref):
                return lang
        if pref in auto_langs:
            return pref
        for lang in auto_langs:
            if lang.startswith(pref):
                return lang

    # Just pick the first available
    if manual_langs:
        return sorted(manual_langs)[0]
    return sorted(languages)[0]


def fetch_captions(video_id, lang, translate_lang, output_dir):
    """Download captions via yt-dlp, parse SRT, return list of segments.

    Returns: (captions, effective_lang, translate_lang_used)
        captions: list of {"start": float, "end": float, "text": str}
        effective_lang: the language code actually used
        translate_lang_used: additional caption language actually downloaded (or None)
    """
    check_tool("yt-dlp")
    url = f"https://www.youtube.com/watch?v={video_id}"

    # Determine which language to use
    effective_lang = lang
    if lang == "auto":
        eprint("[3/9] Detecting available subtitle languages...")
        subs_output = _list_subs(video_id)
        effective_lang = _pick_best_lang(subs_output, None)
        if effective_lang:
            eprint(f"  Auto-selected language: {effective_lang}")
        else:
            eprint("  No subtitles available. Will emit crops without transcript.")
            return [], None, None
    else:
        eprint(f"[3/9] Fetching captions (language: {effective_lang})...")

    # Build sub-langs argument
    sub_langs = [effective_lang]
    translate_lang_used = None
    if translate_lang and translate_lang != effective_lang:
        sub_langs.append(translate_lang)
        translate_lang_used = translate_lang

    srt_pattern = str(output_dir / "%(id)s.%(ext)s")

    cmd = [
        "yt-dlp",
        "--write-auto-subs", "--write-subs",
        "--sub-langs", ",".join(sub_langs),
        "--convert-subs", "srt",
        "--skip-download",
        "--no-playlist", "--no-warnings",
        "--output", srt_pattern,
        url,
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=YTDLP_TIMEOUT
        )
    except subprocess.TimeoutExpired:
        eprint("  WARNING: yt-dlp timed out fetching captions. Proceeding without transcript.")
        return [], effective_lang, translate_lang_used

    if result.returncode != 0:
        eprint(f"  WARNING: yt-dlp caption download failed. Proceeding without transcript.")
        eprint(f"  (stderr: {result.stderr[:200]})")
        return [], effective_lang, translate_lang_used

    # Find the downloaded SRT file
    srt_files = list(output_dir.glob(f"{video_id}*.srt"))
    if not srt_files:
        eprint("  WARNING: No SRT file found after download. Proceeding without transcript.")
        return [], effective_lang, translate_lang_used

    # Pick the primary language SRT file
    primary_srt = None
    for f in srt_files:
        fname = f.name
        if f".{effective_lang}" in fname:
            primary_srt = f
            break
    if primary_srt is None:
        primary_srt = srt_files[0]

    # Parse SRT
    captions = _parse_srt(primary_srt)
    eprint(f"  Downloaded {len(captions)} caption segments ({effective_lang})")

    # If translate_lang was requested and a different SRT file was downloaded, note it.
    # yt-dlp exposes these as additional caption tracks; they are not used for
    # transcript association, which stays with effective_lang.
    if translate_lang_used:
        for f in srt_files:
            if f".{translate_lang_used}" in f.name:
                eprint(f"  Also downloaded additional captions ({translate_lang_used})")
                break
        else:
            translate_lang_used = None

    return captions, effective_lang, translate_lang_used


def _parse_srt(srt_path):
    """Parse an SRT file into segments.

    Returns list of {"start": float, "end": float, "text": str}.
    """
    segments = []
    text = srt_path.read_text(encoding="utf-8", errors="replace")

    # SRT block pattern: index, timestamp --> timestamp, text, blank line
    blocks = re.split(r"\n\s*\n", text.strip())
    for block in blocks:
        lines = block.strip().splitlines()
        if len(lines) < 2:
            continue
        # First line is index (skip), second line is timestamps
        ts_match = re.match(
            r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})",
            lines[1]
        )
        if not ts_match:
            continue
        start = (int(ts_match.group(1)) * 3600 + int(ts_match.group(2)) * 60 +
                 int(ts_match.group(3)) + int(ts_match.group(4)) / 1000)
        end = (int(ts_match.group(5)) * 3600 + int(ts_match.group(6)) * 60 +
               int(ts_match.group(7)) + int(ts_match.group(8)) / 1000)
        caption_text = "\n".join(lines[2:]).strip()
        if caption_text:
            segments.append({"start": start, "end": end, "text": caption_text})

    return segments


# ---------------------------------------------------------------------------
# Stage 5: Timestamp selection
# ---------------------------------------------------------------------------

def _allowed_intervals(duration, sb_segments, margin=0.5):
    """Return non-SponsorBlock intervals as [(start, end), ...]."""
    blocked = []
    for seg in sb_segments:
        start = max(0.0, float(seg["start"]) - margin)
        end = min(float(duration), float(seg["end"]) + margin)
        if end > start:
            blocked.append((start, end))
    blocked.sort()

    merged = []
    for start, end in blocked:
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)

    allowed = []
    pos = 0.0
    for start, end in merged:
        if start > pos:
            allowed.append((pos, start))
        pos = max(pos, end)
    if pos < duration:
        allowed.append((pos, float(duration)))
    return [(s, e) for s, e in allowed if e - s >= 1.0]


def _timestamp_in_intervals(ts, intervals):
    return any(start <= ts <= end for start, end in intervals)


def _allowed_offset_to_timestamp(offset, intervals):
    """Map seconds into the concatenated allowed timeline back to video time."""
    remaining = float(offset)
    for start, end in intervals:
        length = end - start
        if remaining <= length:
            return start + remaining
        remaining -= length
    return intervals[-1][1] if intervals else 0.0


def choose_timestamps(duration, max_candidates, sample_interval, sb_segments, manual_targets):
    """Choose timestamps across the full video while avoiding SponsorBlock.

    The important detail for long videos is that the max-candidate cap is applied
    after distributing samples across the *whole* non-SponsorBlock timeline. This
    avoids the common bug where a 1h+ talk only samples the first N minutes.
    """
    allowed = _allowed_intervals(duration, sb_segments)

    # Manual targets override automatic sampling but still respect SponsorBlock.
    if manual_targets:
        eprint("[4/9] Using manual target timestamps...")
        targets = []
        for ts in manual_targets:
            if _timestamp_in_intervals(ts, allowed):
                targets.append(ts)
            else:
                eprint(f"  Skipping manual target {fmt_timestamp(ts)} (in SponsorBlock segment)")
        targets = sorted(dict.fromkeys(round(t, 3) for t in targets))
        eprint(f"  {len(targets)} manual targets after SB filtering")
        return targets[:max_candidates]

    eprint("[4/9] Computing timestamp distribution...")
    if not allowed:
        return []

    effective_duration = sum(end - start for start, end in allowed)

    if sample_interval is not None:
        interval = max(1.0, float(sample_interval))
    else:
        # Local/free default: dense enough for short visual essays, bounded for
        # long talks. If this would exceed the cap, we later resample evenly.
        if duration <= 30 * 60:
            interval = 8.0
        elif duration <= 60 * 60:
            interval = 12.0
        elif duration <= 2 * 60 * 60:
            interval = 20.0
        else:
            interval = 30.0

    desired_count = max(1, int(math.ceil(effective_duration / interval)))
    count = min(max_candidates, desired_count)

    # Evenly spread samples over allowed time. Midpoints avoid cuts/fades at
    # exact interval boundaries and keep coverage across >1h videos.
    candidates = []
    step = effective_duration / count
    for i in range(count):
        offset = min(effective_duration - 0.25, (i + 0.5) * step)
        ts = _allowed_offset_to_timestamp(offset, allowed)
        # Avoid frame 0/EOF edge cases.
        ts = max(0.5, min(float(duration) - 0.5, ts))
        candidates.append(round(ts, 3))

    # De-dupe rare boundary collisions.
    candidates = sorted(dict.fromkeys(candidates))
    eprint(
        f"  Interval target: {interval:.1f}s → {len(candidates)} candidates "
        f"across {fmt_timestamp(effective_duration)} non-skipped time (max {max_candidates})"
    )
    return candidates


# ---------------------------------------------------------------------------
# Stage 6: Frame extraction
# ---------------------------------------------------------------------------

def extract_frames(video_id, url, timestamps, output_dir, debug, format_selector, keep_video=False):
    """Extract frames from the YouTube video at specified timestamps.

    Uses yt-dlp to get a direct stream URL, then ffmpeg for frame extraction.
    Frames are saved as <timestamp>_raw.jpg in frames/ (debug) or temp.

    Returns: list of {"timestamp": float, "path": str} for successfully extracted frames.
    """
    check_tool("ffmpeg")
    eprint(f"[5/9] Extracting {len(timestamps)} frames...")

    # For many candidates, downloading one modest-resolution video is much
    # faster and more reliable than doing hundreds of remote HTTP seeks. This is
    # especially important for >1h videos. The temporary file is deleted after
    # frame extraction unless --keep-video is used.
    if keep_video or len(timestamps) > 30:
        input_source = _download_video(video_id, url, output_dir, keep_video, debug, format_selector)
    else:
        eprint(f"  Getting stream URL ({format_selector})...")
        input_source = _get_stream_url(video_id, url, format_selector)

    frames_dir = output_dir / "debug" / "frames" if debug else output_dir / ".frames_tmp"
    frames_dir.mkdir(parents=True, exist_ok=True)

    extracted = []
    for i, ts in enumerate(timestamps):
        ts_str = f"{ts:.3f}"
        ts_safe = ts_str.replace(".", "_")
        out_path = frames_dir / f"{ts_safe}_raw.jpg"

        eprint(f"  [{i+1}/{len(timestamps)}] Extracting frame at {fmt_timestamp(ts)}...", end=" ")

        try:
            result = subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-ss", ts_str,
                    "-i", str(input_source),
                    "-frames:v", "1",
                    "-q:v", "2",
                    "-pix_fmt", "yuvj420p",
                    "-loglevel", "error",
                    str(out_path),
                ],
                capture_output=True, text=True, timeout=FRAME_TIMEOUT
            )
            if result.returncode != 0:
                stderr = result.stderr.strip()
                if stderr:
                    eprint(f"FAILED ({stderr[:100]})")
                else:
                    eprint("FAILED (unknown ffmpeg error)")
                continue

            if out_path.stat().st_size == 0:
                eprint("SKIPPED (empty frame)")
                out_path.unlink(missing_ok=True)
                continue

            eprint("OK")
            extracted.append({"timestamp": ts, "path": str(out_path)})

        except subprocess.TimeoutExpired:
            eprint("TIMEOUT (skipping)")
            continue

    eprint(f"  Successfully extracted {len(extracted)}/{len(timestamps)} frames")
    return extracted


def _download_video(video_id, url, output_dir, keep_video, debug, format_selector):
    """Download a bounded-quality local video for fast repeated seeking."""
    if keep_video:
        video_dir = output_dir
    elif debug:
        video_dir = output_dir / "debug"
    else:
        video_dir = output_dir / ".video_tmp"
    video_dir.mkdir(parents=True, exist_ok=True)
    output_template = str(video_dir / "source_video.%(ext)s")
    eprint(f"  Downloading selected video once for fast local seeking ({format_selector})...")

    cmd = [
        "yt-dlp",
        "-f", format_selector,
        "--merge-output-format", "mp4",
        "--no-playlist",
        "--no-warnings",
        "-o", output_template,
        url if url else f"https://www.youtube.com/watch?v={video_id}",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=max(YTDLP_TIMEOUT, 900))
    except subprocess.TimeoutExpired:
        eprint("ERROR: yt-dlp timed out downloading video")
        sys.exit(1)

    if result.returncode != 0:
        eprint(f"ERROR: Could not download video: {result.stderr[:500]}")
        sys.exit(1)

    files = sorted(video_dir.glob("source_video.*"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        eprint("ERROR: yt-dlp did not produce a local video file")
        sys.exit(1)
    eprint(f"  Using local video: {files[0]} ({files[0].stat().st_size / (1024*1024):.1f} MiB)")
    return files[0]


def _get_stream_url(video_id, url, format_selector):
    """Get a direct video stream URL via yt-dlp -g."""
    cmd = [
        "yt-dlp", "-g",
        "-f", format_selector,
        "--no-playlist", "--no-warnings",
        url if url else f"https://www.youtube.com/watch?v={video_id}",
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=YTDLP_TIMEOUT
        )
    except subprocess.TimeoutExpired:
        eprint("ERROR: yt-dlp timed out getting stream URL")
        sys.exit(1)

    if result.returncode != 0:
        eprint(f"ERROR: Could not get stream URL: {result.stderr[:200]}")
        sys.exit(1)

    stream_url = result.stdout.strip().splitlines()
    # Take the first URL (yt-dlp may output multiple for different formats)
    if not stream_url:
        eprint("ERROR: yt-dlp returned empty stream URL")
        sys.exit(1)

    return stream_url[0]


# ---------------------------------------------------------------------------
# Stage 7: Crop generation
# ---------------------------------------------------------------------------

def _candidate_regions(w, h):
    """Geometric crop candidates biased toward picture-in-picture examples.

    Many YouTube explainers place the presenter on the left/center and examples
    on the right. We therefore score right-side crops first, but include center
    and left crops so full-slide/screencast videos still work.
    """
    return [
        ("right_45", int(w * 0.55), int(h * 0.05), int(w * 0.45), int(h * 0.90)),
        ("right_38", int(w * 0.62), int(h * 0.04), int(w * 0.38), int(h * 0.92)),
        ("right_60", int(w * 0.40), int(h * 0.04), int(w * 0.60), int(h * 0.92)),
        ("center_60", int(w * 0.20), int(h * 0.08), int(w * 0.60), int(h * 0.84)),
        ("left_45", 0, int(h * 0.05), int(w * 0.45), int(h * 0.90)),
        ("top_right", int(w * 0.52), 0, int(w * 0.48), int(h * 0.58)),
        ("bottom_right", int(w * 0.52), int(h * 0.38), int(w * 0.48), int(h * 0.58)),
    ]


def _crop_score(img):
    """Score a crop with cheap local image statistics.

    Higher means more likely to contain a slide/photo/object/UI rather than a
    blank wall or plain talking-head background. This is intentionally simple:
    no API calls, no model weights, no OCR dependency.
    """
    from PIL import ImageFilter, ImageStat

    thumb = img.convert("RGB")
    thumb.thumbnail((180, 180), pil_lanczos())
    gray = thumb.convert("L")
    gray_stat = ImageStat.Stat(gray)

    # Contrast/texture.
    contrast = gray_stat.stddev[0]
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_mean = ImageStat.Stat(edges).mean[0]

    # Colorfulness (rough Hasler/Susstrunk-style proxy).
    r, g, b = [pil_pixels(ch) for ch in thumb.split()]
    if r:
        rg = [rv - gv for rv, gv in zip(r, g)]
        yb = [0.5 * (rv + gv) - bv for rv, gv, bv in zip(r, g, b)]
        def _mean(xs): return sum(xs) / len(xs)
        def _std(xs):
            m = _mean(xs)
            return math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs))
        colorfulness = math.sqrt(_std(rg) ** 2 + _std(yb) ** 2) + 0.3 * math.sqrt(_mean(rg) ** 2 + _mean(yb) ** 2)
    else:
        colorfulness = 0.0

    # Penalize nearly-white/blank crops and very dark/fade crops.
    brightness = gray_stat.mean[0]
    blank_penalty = 18.0 if contrast < 10 and (brightness > 220 or brightness < 30) else 0.0
    return round(0.45 * edge_mean + 0.35 * contrast + 0.20 * colorfulness - blank_penalty, 3)


def _region_bias(name):
    """Prefer common example-card locations without requiring face detection."""
    if name == "right_38":
        return 12.0
    if name == "right_45":
        return 11.0
    if name == "right_60":
        return 2.0
    if name in {"top_right", "bottom_right"}:
        return 5.0
    if name.startswith("center"):
        return -3.0
    if name.startswith("left"):
        return -6.0
    return 0.0


def _average_hash(img, size=8):
    gray = img.convert("L").resize((size, size), pil_lanczos())
    pixels = pil_pixels(gray)
    avg = sum(pixels) / len(pixels)
    value = 0
    for p in pixels:
        value = (value << 1) | (1 if p >= avg else 0)
    return f"{value:0{size * size // 4}x}"


def _hash_distance(a, b):
    try:
        return (int(a, 16) ^ int(b, 16)).bit_count()
    except Exception:
        return 999


def _pick_diverse_results(candidates, max_kept, preserve_near_duplicates=False):
    """Select high-scoring crops with timeline coverage and hash dedupe."""
    if not candidates:
        return []

    # Drop weak crops when stronger alternatives exist. If all are weak, keep a
    # few best so manual-target benchmarks still produce inspectable output.
    strong = [c for c in candidates if c["score"] >= MIN_CROP_SCORE]
    pool = strong or sorted(candidates, key=lambda c: c["score"], reverse=True)[:max_kept]

    # Dedupe before timeline bucketing. Manual target runs preserve near
    # duplicates because the human explicitly asked for those timestamps.
    if preserve_near_duplicates:
        deduped = []
        for idx, cand in enumerate(sorted(pool, key=lambda c: c["timestamp"]), 1):
            cand["cluster_id"] = idx
            deduped.append(cand)
    else:
        deduped = []
        clusters = []
        for cand in sorted(pool, key=lambda c: c["timestamp"]):
            matched = None
            for idx, kept_hash in enumerate(clusters):
                if _hash_distance(cand["hash"], kept_hash) <= DEDUP_HASH_DISTANCE:
                    matched = idx
                    break
            if matched is None:
                cand["cluster_id"] = len(clusters) + 1
                clusters.append(cand["hash"])
                deduped.append(cand)
            else:
                cand["cluster_id"] = matched + 1
                # Replace weaker representative within a cluster.
                for i, existing in enumerate(deduped):
                    if existing["cluster_id"] == cand["cluster_id"] and cand["score"] > existing["score"]:
                        deduped[i] = cand
                        break

    if len(deduped) <= max_kept:
        return sorted(deduped, key=lambda c: c["timestamp"])

    # Timeline buckets preserve coverage for long videos instead of simply taking
    # the first N or global top N.
    start = min(c["timestamp"] for c in deduped)
    end = max(c["timestamp"] for c in deduped)
    span = max(1.0, end - start)
    buckets = [[] for _ in range(max_kept)]
    for cand in deduped:
        idx = min(max_kept - 1, int(((cand["timestamp"] - start) / span) * max_kept))
        buckets[idx].append(cand)
    selected = []
    for bucket in buckets:
        if bucket:
            selected.append(max(bucket, key=lambda c: c["score"]))
    # Fill any gaps with remaining highest scoring crops.
    if len(selected) < max_kept:
        selected_hashes = {c["hash"] for c in selected}
        for cand in sorted(deduped, key=lambda c: c["score"], reverse=True):
            if cand["hash"] not in selected_hashes:
                selected.append(cand)
                selected_hashes.add(cand["hash"])
            if len(selected) >= max_kept:
                break
    return sorted(selected[:max_kept], key=lambda c: c["timestamp"])


def generate_crops(extracted_frames, max_kept, output_dir, preserve_near_duplicates=False):
    """Generate one best local/free crop per useful frame.

    The report keeps crops only (no full frame) to avoid wasting context on a
    creator's face/background. Raw frames exist only in debug mode.
    """
    from PIL import Image

    eprint(f"[6/9] Scoring crop candidates for {len(extracted_frames)} frames...")

    crops_dir = output_dir / "crops"
    crops_dir.mkdir(parents=True, exist_ok=True)

    candidates = []
    for frame in extracted_frames:
        ts = frame["timestamp"]
        try:
            img = Image.open(frame["path"]).convert("RGB")
            w, h = img.size
        except Exception as e:
            eprint(f"  WARNING: Could not open frame at {fmt_timestamp(ts)}: {e}")
            continue

        best = None
        for name, x, y, cw, ch in _candidate_regions(w, h):
            x = max(0, min(w - 1, x)); y = max(0, min(h - 1, y))
            cw = max(32, min(w - x, cw)); ch = max(32, min(h - y, ch))
            crop_img = img.crop((x, y, x + cw, y + ch))
            score = _crop_score(crop_img) + _region_bias(name)
            if best is None or score > best["score"]:
                best = {
                    "timestamp": ts,
                    "timestamp_formatted": fmt_timestamp(ts),
                    "region_name": name,
                    "region": {"x": x, "y": y, "w": cw, "h": ch},
                    "score": score,
                    "hash": _average_hash(crop_img),
                    "image": crop_img.copy(),
                    "source_frame": frame["path"],
                    "source_size": {"w": w, "h": h},
                }
        img.close()
        if best:
            candidates.append(best)

    selected = _pick_diverse_results(candidates, max_kept, preserve_near_duplicates)
    crop_results = []
    for idx, cand in enumerate(selected, 1):
        ts_safe = fmt_timestamp_compact(cand["timestamp"])
        out_path = crops_dir / f"{idx:03d}_{ts_safe}_{cand['region_name']}.jpg"
        cand["image"].save(str(out_path), quality=88)
        cand["image"].close()
        crop_results.append({
            "timestamp": cand["timestamp"],
            "timestamp_formatted": cand["timestamp_formatted"],
            "image_path": str(out_path),
            "crop_region": cand["region"],
            "region_name": cand["region_name"],
            "score": cand["score"],
            "hash": cand["hash"],
            "cluster_id": cand.get("cluster_id"),
            "source_frame": cand["source_frame"],
            "source_size": cand["source_size"],
            "keep_reason": f"best local crop candidate ({cand['region_name']}), score {cand['score']}",
        })

    selected_ids = {id(c) for c in selected}
    for cand in candidates:
        if id(cand) not in selected_ids:
            try:
                cand["image"].close()
            except Exception:
                pass

    eprint(
        f"  Scored {len(candidates)} frames; kept {len(crop_results)} crops "
        f"in report (max {max_kept})"
    )
    return crop_results


# ---------------------------------------------------------------------------
# Stage 8: Transcript association
# ---------------------------------------------------------------------------

def associate_transcript(crop_results, captions, window_seconds, sb_segments=None):
    """Associate transcript segments with each crop timestamp.

    For each crop, find caption segments that overlap with
    [timestamp - window, timestamp + window].

    Updates crop_results in-place by adding "transcript_segments" and
    "transcript_text" fields.
    """
    if not captions:
        eprint("[7/9] No captions available, skipping transcript association.")
        return

    eprint(f"[7/9] Associating transcript with {len(crop_results)} crops...")

    sb_segments = sb_segments or []

    def _caption_overlaps_sponsor(seg):
        for sb in sb_segments:
            if seg["end"] >= sb["start"] - 0.5 and seg["start"] <= sb["end"] + 0.5:
                return True
        return False

    for crop in crop_results:
        ts = crop["timestamp"]
        matches = []
        for seg in captions:
            if _caption_overlaps_sponsor(seg):
                continue
            if seg["end"] >= ts - window_seconds and seg["start"] <= ts + window_seconds:
                matches.append(seg)
        crop["transcript_segments"] = matches
        crop["transcript_text"] = compact_transcript(matches)

    associated = sum(1 for c in crop_results if c.get("transcript_segments"))
    eprint(f"  Associated transcript with {associated}/{len(crop_results)} crops")


# ---------------------------------------------------------------------------
# Stage 9: Markdown report
# ---------------------------------------------------------------------------

def write_report(output_dir, metadata, crop_results, sb_segments):
    """Write the Markdown report to output_dir/report.md.

    Includes:
        - H1: video title + link
        - Video metadata (duration, uploader)
        - For each crop: H2 timestamp, blockquote transcript, image
        - SponsorBlock summary footer
    """
    report_path = output_dir / "report.md"
    eprint(f"[8/9] Writing Markdown report to {report_path}...")

    lines = []
    lines.append(f"# {metadata['title']}")
    lines.append("")
    lines.append(f"[Watch on YouTube]({metadata['webpage_url']})")
    lines.append("")
    lines.append(f"- **Duration:** {fmt_timestamp(metadata['duration'])}")
    lines.append(f"- **Uploader:** {metadata['uploader']}")
    lines.append(f"- **Crops:** {len(crop_results)}")
    lines.append("")

    if sb_segments:
        sb_total = sum(s["end"] - s["start"] for s in sb_segments)
        lines.append(f"- **SponsorBlock segments skipped:** {len(sb_segments)} ({fmt_timestamp(sb_total)} total)")
        lines.append("")

    lines.append("---")
    lines.append("")

    for i, crop in enumerate(crop_results):
        ts = crop["timestamp_formatted"]
        lines.append(f"## {ts}")
        lines.append("")

        transcript = crop.get("transcript_text", "")
        if transcript:
            lines.append(f"> {transcript}")
            lines.append("")

        lines.append(
            f"- **Crop:** `{crop.get('region_name', 'unknown')}` "
            f"score `{crop.get('score', 0)}`"
        )
        if crop.get("keep_reason"):
            lines.append(f"- **Keep reason:** {crop['keep_reason']}")
        lines.append("")

        crop_rel = Path(crop["image_path"]).name
        lines.append(f"![Crop at {ts}](crops/{crop_rel})")
        lines.append("")
        lines.append("---")
        lines.append("")

    # Footer with generation info
    lines.append("")
    lines.append("*Generated by youtube-visual-insights*")

    report_path.write_text("\n".join(lines), encoding="utf-8")
    eprint(f"  Report written ({report_path.stat().st_size} bytes)")


# ---------------------------------------------------------------------------
# Stage 10: JSON manifest
# ---------------------------------------------------------------------------

def write_manifest(output_dir, metadata, crop_results, sb_segments,
                   skipped_categories, effective_lang, translate_lang_used,
                   quality, format_selector, format_override=None):
    """Write the JSON manifest to output_dir/manifest.json."""
    manifest_path = output_dir / "manifest.json"
    eprint(f"[9/9] Writing JSON manifest to {manifest_path}...")

    source_video = metadata.get("source_video") or {}
    source_dimensions = None
    if source_video.get("width") or source_video.get("height"):
        source_dimensions = {"w": source_video.get("width"), "h": source_video.get("height")}
    elif crop_results and crop_results[0].get("source_size"):
        source_dimensions = crop_results[0].get("source_size")

    manifest = {
        "video_id": metadata["video_id"],
        "video_title": metadata["title"],
        "video_url": metadata["webpage_url"],
        "duration_seconds": metadata["duration"],
        "uploader": metadata["uploader"],
        "language": effective_lang or metadata.get("language", "unknown"),
        "translate_language": translate_lang_used,
        "selected_quality": quality,
        "yt_dlp_format_selector": format_selector,
        "format_override": format_override,
        "source_video_dimensions": source_dimensions,
        "source_video_format": source_video or None,
        "sponsorblock_categories_skipped": skipped_categories,
        "sponsorblock_segments": sb_segments,
        "crops": [],
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    for crop in crop_results:
        crop_entry = {
            "timestamp_seconds": crop["timestamp"],
            "timestamp_formatted": crop["timestamp_formatted"],
            "image_path": f"crops/{Path(crop['image_path']).name}",
            "crop_region": crop["crop_region"],
            "crop_dimensions": {
                "w": crop["crop_region"].get("w"),
                "h": crop["crop_region"].get("h"),
            },
            "region_name": crop.get("region_name"),
            "score": crop.get("score"),
            "hash": crop.get("hash"),
            "cluster_id": crop.get("cluster_id"),
            "keep_reason": crop.get("keep_reason"),
            "source_size": crop.get("source_size"),
            "transcript_segments": crop.get("transcript_segments", []),
            "transcript_text": crop.get("transcript_text", ""),
            "sponsorblock_overlap": False,
        }
        # Check for SB overlap (redundant safety check)
        for seg in sb_segments:
            if seg["start"] <= crop["timestamp"] <= seg["end"]:
                crop_entry["sponsorblock_overlap"] = True
                break
        manifest["crops"].append(crop_entry)

    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    eprint(f"  Manifest written ({manifest_path.stat().st_size} bytes)")

    source_bundle = {
        "source_type": "youtube",
        "source_url": metadata["webpage_url"],
        "video_id": metadata["video_id"],
        "title": metadata["title"],
        "creator": metadata["uploader"],
        "duration_seconds": metadata["duration"],
        "language": effective_lang or metadata.get("language", "unknown"),
        "visual_report_path": "report.md",
        "visual_manifest_path": "manifest.json",
        "crops_dir": "crops",
        "transcript_source": "yt-dlp captions associated per crop",
    }
    bundle_path = output_dir / "source_bundle.json"
    bundle_path.write_text(json.dumps(source_bundle, indent=2, ensure_ascii=False), encoding="utf-8")
    eprint(f"  Source bundle written ({bundle_path.stat().st_size} bytes)")


# ---------------------------------------------------------------------------
# Stage 11: Cleanup
# ---------------------------------------------------------------------------

def cleanup(output_dir, debug):
    """Clean up temporary/intermediate files.

    Always delete temporary raw frames and temporary downloaded video files.
    If not --debug: also delete downloaded SRT/info files.
    If --debug: keep SRT/info files in debug/ with raw frames and SponsorBlock data.
    """
    debug_dir = output_dir / "debug"

    temp_frames = output_dir / ".frames_tmp"
    if temp_frames.exists():
        if debug:
            debug_frames = debug_dir / "frames"
            debug_frames.mkdir(parents=True, exist_ok=True)
            for f in temp_frames.iterdir():
                shutil.move(str(f), str(debug_frames / f.name))
            shutil.rmtree(temp_frames, ignore_errors=True)
        else:
            shutil.rmtree(temp_frames)

    # Remove temporary downloaded video unless it was explicitly kept in the
    # output root by --keep-video.
    video_tmp = output_dir / ".video_tmp"
    if video_tmp.exists():
        shutil.rmtree(video_tmp, ignore_errors=True)

    if debug:
        debug_dir.mkdir(parents=True, exist_ok=True)
        for pattern in ("*.srt", "*.info.json"):
            for artifact in output_dir.glob(pattern):
                target = debug_dir / artifact.name
                if target.exists():
                    target.unlink()
                shutil.move(str(artifact), str(target))
        return

    # Remove SRT files from output root.
    for srt_file in output_dir.glob("*.srt"):
        srt_file.unlink(missing_ok=True)
    # Remove any yt-dlp info JSON.
    for info_file in output_dir.glob("*.info.json"):
        info_file.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Extract visual crop examples from YouTube videos (local/free)."
    )
    parser.add_argument(
        "url",
        help="YouTube URL (watch?v=, youtu.be, shorts) or raw video ID",
    )
    parser.add_argument(
        "--lang",
        default="auto",
        help="Caption language ISO code (e.g. 'de', 'ja', 'en'). Default: auto-detect.",
    )
    parser.add_argument(
        "--translate-lang",
        default=None,
        help="Optional additional caption language to download (e.g. 'en'). Does not affect primary transcript association.",
    )
    parser.add_argument(
        "--sample-interval",
        type=float,
        default=None,
        help="Seconds between frame samples (default: auto-scaled from duration).",
    )
    parser.add_argument(
        "--max-candidates",
        type=int,
        default=DEFAULT_MAX_CANDIDATES,
        help=f"Maximum frames to extract (default: {DEFAULT_MAX_CANDIDATES}).",
    )
    parser.add_argument(
        "--max-kept",
        type=int,
        default=DEFAULT_MAX_KEPT,
        help=f"Maximum crops to include in report (default: {DEFAULT_MAX_KEPT}).",
    )
    parser.add_argument(
        "--quality",
        choices=sorted(QUALITY_FORMAT_SELECTORS),
        default=DEFAULT_QUALITY,
        help=(
            "Video quality mode for frame extraction: fast=720p-or-lower, "
            "high=1080p-or-lower, max=best available (default: %(default)s)."
        ),
    )
    parser.add_argument(
        "--format",
        dest="format_override",
        default=None,
        help="Advanced yt-dlp format selector override. When set, overrides --quality's selector.",
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output directory (default: temp dir named ytvi-{video_id}-{rand}).",
    )
    parser.add_argument(
        "--keep-video",
        action="store_true",
        help="Keep the temporary downloaded source video after frame extraction.",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Keep raw frames, SRT files, SponsorBlock response/status, and any downloaded source video in debug/ subdirectory.",
    )
    parser.add_argument(
        "--manual-targets",
        default=None,
        help="Comma-separated timestamps for benchmark/tuning (seconds, MM:SS, or HH:MM:SS; overrides auto-selection).",
    )
    parser.add_argument(
        "--sponsorblock-categories",
        default=DEFAULT_SB_CATEGORIES,
        help=f"Comma-separated SponsorBlock categories to skip (default: {DEFAULT_SB_CATEGORIES}).",
    )
    parser.add_argument(
        "--skip-sponsorblock",
        action="store_true",
        help="Disable SponsorBlock filtering entirely.",
    )
    parser.add_argument(
        "--transcript-window",
        type=float,
        default=DEFAULT_TRANSCRIPT_WINDOW,
        help=f"Seconds before/after each crop to capture transcript (default: {DEFAULT_TRANSCRIPT_WINDOW}).",
    )

    args = parser.parse_args()
    format_selector = resolve_format_selector(args.quality, args.format_override)

    # Check required CLI tools
    check_tool("yt-dlp")
    check_tool("ffmpeg")

    # Stage 1: Extract video ID
    video_id = extract_video_id(args.url)

    # Setup output directory
    if args.output:
        output_dir = Path(args.output).resolve()
    else:
        tmp_base = Path(tempfile.gettempdir())
        output_dir = tmp_base / f"ytvi-{video_id}-{rand_suffix()}"
    output_dir.mkdir(parents=True, exist_ok=True)
    eprint(f"Output directory: {output_dir}")
    eprint(f"Quality: {args.quality}")
    eprint(f"yt-dlp format selector: {format_selector}")

    # Parse manual targets
    manual_targets = None
    if args.manual_targets:
        try:
            manual_targets = [parse_timestamp(t) for t in args.manual_targets.split(",") if t.strip()]
        except ValueError:
            eprint("ERROR: --manual-targets must be comma-separated timestamps (seconds, MM:SS, or HH:MM:SS)")
            sys.exit(1)

    try:
        # Stage 2: Metadata
        metadata = fetch_metadata(video_id, format_selector)

        # Stage 3: SponsorBlock
        sb_segments, skipped_categories = fetch_sponsorblock(
            video_id, args.sponsorblock_categories, args.skip_sponsorblock,
            output_dir=output_dir, debug=args.debug
        )

        # Stage 4: Captions
        captions, effective_lang, translate_lang_used = fetch_captions(
            video_id, args.lang, args.translate_lang, output_dir
        )

        # Stage 5: Timestamps
        timestamps = choose_timestamps(
            metadata["duration"], args.max_candidates, args.sample_interval,
            sb_segments, manual_targets
        )

        if not timestamps:
            eprint("ERROR: No valid timestamps to extract (all in SponsorBlock segments?)")
            sys.exit(1)

        # Stage 6: Frame extraction
        extracted_frames = extract_frames(
            video_id, args.url, timestamps, output_dir, args.debug,
            format_selector,
            keep_video=args.keep_video
        )

        if not extracted_frames:
            eprint("ERROR: Failed to extract any frames.")
            sys.exit(1)

        # Stage 7: Crop generation
        crop_results = generate_crops(
            extracted_frames, args.max_kept, output_dir,
            preserve_near_duplicates=bool(manual_targets)
        )

        # Stage 8: Transcript association
        associate_transcript(crop_results, captions, args.transcript_window, sb_segments)

        # Stage 9: Markdown report
        write_report(output_dir, metadata, crop_results, sb_segments)

        # Stage 10: JSON manifest
        write_manifest(output_dir, metadata, crop_results, sb_segments,
                       skipped_categories, effective_lang, translate_lang_used,
                       args.quality, format_selector, args.format_override)

        # Stage 11: Cleanup
        cleanup(output_dir, args.debug)

    except KeyboardInterrupt:
        eprint("\nInterrupted. Partial output may remain in:", output_dir)
        sys.exit(130)

    # Print output hints
    eprint("")
    eprint("=" * 60)
    eprint(f"Done! Output in: {output_dir}")
    eprint(f"  Report: {output_dir / 'report.md'}")
    eprint(f"  Manifest: {output_dir / 'manifest.json'}")
    eprint(f"  Crops: {output_dir / 'crops'}/")
    if args.debug:
        eprint(f"  Debug: {output_dir / 'debug'}/")
    eprint("=" * 60)


if __name__ == "__main__":
    main()
