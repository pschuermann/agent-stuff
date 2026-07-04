#!/usr/bin/env python3
"""Compare transcript-only and local-visual youtube-visual-insights outputs.

This is a lightweight Plan A benchmark harness. It creates one bundle per video:

    <output>/<video_id>/
        metadata.json
        transcript-only.md
        visual-local/report.md
        visual-local/manifest.json
        visual-local/contact.jpg        # optional, with --contact-sheet
        comparison.md

The harness is intentionally local/free. It never calls a vision model. For URL
inputs it can run extract_visual_insights.py, which uses yt-dlp/ffmpeg and
SponsorBlock. For existing extractor output directories it reuses report.md,
manifest.json, and crops instead of extracting again.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
import tempfile
import textwrap
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_EXTRACT_SCRIPT = SCRIPT_DIR / "extract_visual_insights.py"
DEFAULT_SB_CATEGORIES = "sponsor,selfpromo,interaction,intro,outro"

# Reuse small, local helpers from the extractor when possible. Importing the
# module is cheap; Pillow is only imported by extractor functions that need it.
# Keep benchmark runs from leaving __pycache__ artifacts in the skill directory.
sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPT_DIR))
try:  # pragma: no cover - exercised by CLI smoke tests instead.
    import extract_visual_insights as extractor
except Exception:  # Keep --help usable even if the extractor is broken.
    extractor = None  # type: ignore[assignment]


def eprint(*args: object) -> None:
    print(*args, file=sys.stderr)


def fmt_timestamp(seconds: float | int | None) -> str:
    if extractor is not None and hasattr(extractor, "fmt_timestamp"):
        try:
            return extractor.fmt_timestamp(seconds or 0)
        except Exception:
            pass
    seconds = float(seconds or 0)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def extract_video_id(value: str) -> str:
    if extractor is None:
        raise SystemExit("ERROR: could not import extract_visual_insights.py")
    return extractor.extract_video_id(value)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def clean_text(text: str) -> str:
    return " ".join(str(text or "").split())


def overlap(start: float, end: float, sb_segments: list[dict[str, Any]]) -> bool:
    for seg in sb_segments:
        seg_start = float(seg.get("start", 0))
        seg_end = float(seg.get("end", 0))
        if end >= seg_start and start <= seg_end:
            return True
    return False


def load_input_lines(path: Path) -> list[str]:
    values: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        values.append(line)
    return values


def classify_inputs(args: argparse.Namespace) -> tuple[list[str], list[Path]]:
    urls: list[str] = []
    visual_dirs: list[Path] = []

    for urls_file in args.urls_file or []:
        urls.extend(load_input_lines(Path(urls_file).expanduser()))

    for visual_dir in args.visual_dir or []:
        visual_dirs.append(Path(visual_dir).expanduser())

    for item in args.inputs:
        path = Path(item).expanduser()
        if path.exists():
            visual_dirs.append(path)
        else:
            urls.append(item)

    return urls, visual_dirs


def bundle_dir_for_manifest(output_root: Path, manifest: dict[str, Any], fallback: str) -> Path:
    video_id = str(manifest.get("video_id") or fallback)
    return output_root / video_id


def copy_visual_output(src_dir: Path, dest_dir: Path, force: bool = False) -> None:
    src_dir = src_dir.resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)

    for filename in ("manifest.json", "report.md"):
        src = src_dir / filename
        if not src.exists():
            raise SystemExit(f"ERROR: existing extractor output is missing {src}")
        dest = dest_dir / filename
        if force or not dest.exists():
            shutil.copy2(src, dest)

    src_crops = src_dir / "crops"
    dest_crops = dest_dir / "crops"
    if src_crops.exists():
        if force and dest_crops.exists():
            shutil.rmtree(dest_crops)
        if not dest_crops.exists():
            shutil.copytree(src_crops, dest_crops)


def run_extractor(url: str, visual_dir: Path, args: argparse.Namespace) -> None:
    manifest = visual_dir / "manifest.json"
    report = visual_dir / "report.md"
    if manifest.exists() and report.exists() and not args.force_extract:
        eprint(f"Reusing existing visual extraction: {visual_dir}")
        return

    visual_dir.mkdir(parents=True, exist_ok=True)
    extract_script = Path(args.extract_script).expanduser().resolve()
    if shutil.which("uv"):
        cmd = ["uv", "run", str(extract_script), url]
    else:
        cmd = [sys.executable, str(extract_script), url]

    cmd.extend(["--output", str(visual_dir)])
    cmd.extend(["--lang", args.lang])
    cmd.extend(["--max-candidates", str(args.max_candidates)])
    cmd.extend(["--max-kept", str(args.max_kept)])
    cmd.extend(["--transcript-window", str(args.transcript_window)])
    if args.sample_interval is not None:
        cmd.extend(["--sample-interval", str(args.sample_interval)])
    if args.manual_targets:
        cmd.extend(["--manual-targets", args.manual_targets])
    if args.sponsorblock_categories:
        cmd.extend(["--sponsorblock-categories", args.sponsorblock_categories])
    if args.skip_sponsorblock:
        cmd.append("--skip-sponsorblock")
    if args.extract_debug:
        cmd.append("--debug")

    eprint("Running extractor:", " ".join(cmd))
    result = subprocess.run(cmd, text=True)
    if result.returncode != 0:
        raise SystemExit(f"ERROR: extractor failed for {url} with exit code {result.returncode}")


def find_existing_srt(visual_dir: Path, video_id: str) -> Path | None:
    candidates: list[Path] = []
    candidates.extend(visual_dir.glob(f"{video_id}*.srt"))
    candidates.extend((visual_dir / "debug").glob(f"{video_id}*.srt"))
    if not candidates:
        candidates.extend(visual_dir.glob("*.srt"))
        candidates.extend((visual_dir / "debug").glob("*.srt"))
    return sorted(candidates)[0] if candidates else None


def transcript_from_manifest_snippets(manifest: dict[str, Any], sb_segments: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], str]:
    seen: set[tuple[float, float, str]] = set()
    segments: list[dict[str, Any]] = []
    for crop in manifest.get("crops", []):
        for seg in crop.get("transcript_segments", []) or []:
            start = float(seg.get("start", crop.get("timestamp_seconds", 0)))
            end = float(seg.get("end", start))
            text = clean_text(seg.get("text", ""))
            if not text or overlap(start, end, sb_segments):
                continue
            key = (round(start, 3), round(end, 3), text)
            if key not in seen:
                seen.add(key)
                segments.append({"start": start, "end": end, "text": text})
    segments.sort(key=lambda item: (item["start"], item["end"]))
    return segments, "manifest crop-associated transcript snippets"


def fetch_or_load_transcript(
    manifest: dict[str, Any],
    visual_dir: Path,
    args: argparse.Namespace,
) -> tuple[list[dict[str, Any]], str]:
    video_id = str(manifest.get("video_id") or "")
    sb_segments = manifest.get("sponsorblock_segments", []) or []

    if extractor is not None and video_id:
        srt_path = find_existing_srt(visual_dir, video_id)
        if srt_path is not None:
            segments = extractor._parse_srt(srt_path)  # type: ignore[attr-defined]
            filtered = [
                seg for seg in segments
                if not overlap(float(seg.get("start", 0)), float(seg.get("end", 0)), sb_segments)
            ]
            return filtered, f"existing SRT {srt_path}"

    if not args.no_fetch_transcript and extractor is not None and video_id:
        # Use a temp directory so the comparison bundle stays compact. The
        # resulting transcript is still filtered by the manifest's SponsorBlock
        # ranges before it is written.
        with tempfile.TemporaryDirectory(prefix="ytvi-compare-captions-") as tmp:
            lang = args.lang
            manifest_lang = manifest.get("language")
            if lang == "auto" and manifest_lang and manifest_lang != "unknown":
                lang = str(manifest_lang)
            try:
                segments, effective_lang, _ = extractor.fetch_captions(  # type: ignore[attr-defined]
                    video_id, lang, None, Path(tmp)
                )
            except SystemExit:
                segments = []
                effective_lang = None
            except Exception as exc:  # Keep existing-output mode robust offline.
                eprint(f"WARNING: caption fetch failed for {video_id}: {exc}")
                segments = []
                effective_lang = None
            if segments:
                filtered = [
                    seg for seg in segments
                    if not overlap(float(seg.get("start", 0)), float(seg.get("end", 0)), sb_segments)
                ]
                return filtered, f"yt-dlp captions ({effective_lang or lang}), SponsorBlock-filtered"

    return transcript_from_manifest_snippets(manifest, sb_segments)


def write_metadata(bundle_dir: Path, manifest: dict[str, Any], visual_source: str, transcript_source: str) -> None:
    crops = manifest.get("crops", []) or []
    metadata = {
        "video_id": manifest.get("video_id"),
        "video_title": manifest.get("video_title"),
        "video_url": manifest.get("video_url"),
        "duration_seconds": manifest.get("duration_seconds"),
        "duration_formatted": fmt_timestamp(manifest.get("duration_seconds") or 0),
        "uploader": manifest.get("uploader"),
        "language": manifest.get("language"),
        "visual_source": visual_source,
        "transcript_source": transcript_source,
        "crop_count": len(crops),
        "sponsorblock_categories_skipped": manifest.get("sponsorblock_categories_skipped", []),
        "sponsorblock_segments": manifest.get("sponsorblock_segments", []),
        "extractor_generated_at": manifest.get("generated_at"),
        "harness": "compare_transcript_vs_visual.py",
        "modes": {
            "mode_0": "transcript-only baseline (no model calls)",
            "mode_1": "local visual crops from youtube-visual-insights (no model calls)",
        },
    }
    write_json(bundle_dir / "metadata.json", metadata)


def write_transcript_only(bundle_dir: Path, manifest: dict[str, Any], segments: list[dict[str, Any]], source: str) -> None:
    lines: list[str] = []
    title = manifest.get("video_title") or manifest.get("video_id") or "Unknown video"
    lines.append(f"# Transcript-only baseline: {title}")
    lines.append("")
    if manifest.get("video_url"):
        lines.append(f"[Watch on YouTube]({manifest['video_url']})")
        lines.append("")
    lines.append(f"- **Mode:** 0 / transcript-only")
    lines.append(f"- **Transcript source:** {source}")
    lines.append(f"- **SponsorBlock exclusions preserved:** {len(manifest.get('sponsorblock_segments', []) or [])} segment(s)")
    lines.append(f"- **Transcript segments written:** {len(segments)}")
    lines.append("")
    lines.append("This baseline intentionally contains no visual crop content and no model-generated summary.")
    lines.append("")
    lines.append("## Transcript")
    lines.append("")

    if not segments:
        lines.append("_No transcript text available from captions or manifest snippets._")
    else:
        for seg in segments:
            start = fmt_timestamp(float(seg.get("start", 0)))
            end = fmt_timestamp(float(seg.get("end", seg.get("start", 0))))
            text = clean_text(seg.get("text", ""))
            if text:
                lines.append(f"- `{start}–{end}` {text}")

    (bundle_dir / "transcript-only.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def score_value(crop: dict[str, Any]) -> float:
    try:
        return float(crop.get("score") or 0)
    except (TypeError, ValueError):
        return 0.0


def crop_rel_path(crop: dict[str, Any]) -> str:
    image_path = str(crop.get("image_path") or "")
    return str(Path("visual-local") / image_path) if image_path else ""


def crop_in_sponsorblock(crop: dict[str, Any], sb_segments: list[dict[str, Any]]) -> bool:
    if crop.get("sponsorblock_overlap"):
        return True
    ts = float(crop.get("timestamp_seconds") or 0)
    return overlap(ts, ts, sb_segments)


def crop_transcript_for_review(crop: dict[str, Any], sb_segments: list[dict[str, Any]]) -> str:
    if crop_in_sponsorblock(crop, sb_segments):
        return ""
    return clean_text(crop.get("transcript_text", ""))


def summarize_crops(manifest: dict[str, Any]) -> dict[str, Any]:
    crops = manifest.get("crops", []) or []
    sb_segments = manifest.get("sponsorblock_segments", []) or []
    scores = [score_value(crop) for crop in crops]
    associated = [crop for crop in crops if crop_transcript_for_review(crop, sb_segments)]
    noisy = [
        crop for crop in crops
        if score_value(crop) < 20 or not crop_transcript_for_review(crop, sb_segments) or crop_in_sponsorblock(crop, sb_segments)
    ]
    clusters = defaultdict(list)
    hashes = defaultdict(list)
    for crop in crops:
        if crop.get("cluster_id") is not None:
            clusters[crop.get("cluster_id")].append(crop)
        if crop.get("hash"):
            hashes[crop.get("hash")].append(crop)
    redundant_groups = [group for group in list(clusters.values()) + list(hashes.values()) if len(group) > 1]
    return {
        "count": len(crops),
        "scores": scores,
        "avg_score": sum(scores) / len(scores) if scores else 0.0,
        "max_score": max(scores) if scores else 0.0,
        "associated_count": len(associated),
        "association_ratio": (len(associated) / len(crops)) if crops else 0.0,
        "noisy": noisy,
        "redundant_groups": redundant_groups,
        "top": sorted(crops, key=score_value, reverse=True)[:5],
    }


def cheap_vision_recommendation(stats: dict[str, Any]) -> tuple[str, str]:
    crop_count = stats["count"]
    association_ratio = stats["association_ratio"]
    avg_score = stats["avg_score"]
    noisy_ratio = (len(stats["noisy"]) / crop_count) if crop_count else 1.0

    if crop_count >= 5 and association_ratio >= 0.5 and avg_score >= 25 and noisy_ratio <= 0.5:
        return (
            "Yes",
            "enough locally selected crops, usable transcript alignment, and moderate/high crop scores for a cheap vision pass.",
        )
    if crop_count >= 3 and (association_ratio >= 0.35 or avg_score >= 22):
        return (
            "Maybe",
            "local crops exist, but alignment/score/noise should be spot-checked before spending model budget.",
        )
    return (
        "No / low priority",
        "too few useful local crops or weak transcript alignment for an initial cheap vision benchmark.",
    )


def write_comparison(bundle_dir: Path, manifest: dict[str, Any], transcript_segments: list[dict[str, Any]]) -> None:
    stats = summarize_crops(manifest)
    recommendation, rationale = cheap_vision_recommendation(stats)
    crops = manifest.get("crops", []) or []
    sb_segments = manifest.get("sponsorblock_segments", []) or []
    category_counts = Counter(seg.get("category", "unknown") for seg in sb_segments)

    lines: list[str] = []
    title = manifest.get("video_title") or manifest.get("video_id") or "Unknown video"
    lines.append(f"# Transcript-only vs local visual comparison: {title}")
    lines.append("")
    lines.append("This report compares Mode 0 (transcript-only baseline) against Mode 1 (local visual extraction). It is local/free and contains no vision-model output.")
    lines.append("")
    lines.append("## Inputs")
    lines.append("")
    lines.append("- **Mode 0:** [`transcript-only.md`](transcript-only.md)")
    lines.append("- **Mode 1:** [`visual-local/report.md`](visual-local/report.md), [`visual-local/manifest.json`](visual-local/manifest.json)")
    lines.append(f"- **Transcript segments available:** {len(transcript_segments)}")
    lines.append(f"- **Crops available:** {stats['count']}")
    lines.append(f"- **SponsorBlock exclusions:** {len(sb_segments)} segment(s)" + (f" ({dict(category_counts)})" if category_counts else ""))
    lines.append("")

    lines.append("## 1. What transcript-only missed")
    lines.append("")
    if not crops:
        lines.append("No local crops were available, so this harness cannot identify visual gaps beyond noting that transcript-only has no access to on-screen examples, layouts, diagrams, UI, colors, or slide text.")
    else:
        lines.append("Transcript-only cannot verify the visible examples, layout, diagrams, UI, color/material choices, gestures, or on-screen text represented by the crops below. Review these crop timestamps for visual evidence that is absent from text alone:")
        lines.append("")
        for crop in stats["top"]:
            ts = crop.get("timestamp_formatted") or fmt_timestamp(crop.get("timestamp_seconds") or 0)
            transcript = crop_transcript_for_review(crop, sb_segments)
            if crop_in_sponsorblock(crop, sb_segments):
                transcript_note = " — SponsorBlock-excluded timestamp; transcript cue suppressed"
            else:
                transcript_note = f" — transcript cue: {transcript[:160]}" if transcript else " — no nearby transcript cue"
            path = crop_rel_path(crop)
            link = f"[{path}]({path})" if path else "no image path"
            lines.append(f"- `{ts}` {link}, score `{score_value(crop):.1f}`{transcript_note}")
    lines.append("")

    lines.append("## 2. What local crops add for human review")
    lines.append("")
    lines.append(f"- Local extractor kept **{stats['count']}** crop(s); average score `{stats['avg_score']:.1f}`, max score `{stats['max_score']:.1f}`.")
    lines.append(f"- **{stats['associated_count']}/{stats['count']}** crop(s) have nearby transcript text for context." if stats["count"] else "- No crop context available.")
    lines.append("- Crops provide timestamped visual anchors that a human can inspect before deciding whether a paid/cheap vision model is warranted.")
    lines.append("- The harness reuses the extractor manifest/report and does not reinterpret image contents semantically.")
    lines.append("")

    lines.append("## 3. Useful, noisy, and redundant crop notes")
    lines.append("")
    if stats["top"]:
        lines.append("### Likely useful crops (highest local scores)")
        lines.append("")
        for crop in stats["top"]:
            ts = crop.get("timestamp_formatted") or fmt_timestamp(crop.get("timestamp_seconds") or 0)
            region = crop.get("region_name") or "unknown"
            path = crop_rel_path(crop)
            lines.append(f"- `{ts}` `{region}` score `{score_value(crop):.1f}` — {path}")
        lines.append("")
    if stats["noisy"]:
        lines.append("### Potentially noisy crops")
        lines.append("")
        for crop in stats["noisy"][:8]:
            ts = crop.get("timestamp_formatted") or fmt_timestamp(crop.get("timestamp_seconds") or 0)
            reasons = []
            if score_value(crop) < 20:
                reasons.append("low local score")
            if not crop_transcript_for_review(crop, sb_segments):
                reasons.append("no nearby transcript")
            if crop_in_sponsorblock(crop, sb_segments):
                reasons.append("SponsorBlock overlap flag")
            lines.append(f"- `{ts}`: {', '.join(reasons)}")
        lines.append("")
    else:
        lines.append("No obviously noisy crops by simple local heuristics (score >= 20, transcript present, no SponsorBlock overlap flag).")
        lines.append("")
    if stats["redundant_groups"]:
        lines.append("### Potential redundancy")
        lines.append("")
        for group in stats["redundant_groups"][:5]:
            timestamps = ", ".join(str(crop.get("timestamp_formatted") or fmt_timestamp(crop.get("timestamp_seconds") or 0)) for crop in group[:6])
            lines.append(f"- Similar cluster/hash group with {len(group)} crop(s): {timestamps}")
        lines.append("")
    else:
        lines.append("No repeated cluster/hash groups were reported by the extractor manifest.")
        lines.append("")

    lines.append("## 4. Transcript association quality")
    lines.append("")
    if stats["count"]:
        lines.append(f"- Association ratio: **{stats['association_ratio']:.0%}** ({stats['associated_count']}/{stats['count']} crops).")
    else:
        lines.append("- Association ratio: not available; no crops.")
    if sb_segments:
        total_sb = sum(float(seg.get("end", 0)) - float(seg.get("start", 0)) for seg in sb_segments)
        lines.append(f"- SponsorBlock-filtered transcript/crop review preserved **{len(sb_segments)}** excluded range(s), totaling about `{fmt_timestamp(total_sb)}`.")
    else:
        lines.append("- No SponsorBlock ranges were present in the manifest, or SponsorBlock was skipped/unavailable.")
    lines.append("- Good association means the crop timestamp has nearby caption text; it does not mean the transcript describes all visible details.")
    lines.append("")

    lines.append("## 5. Worth cheap vision testing?")
    lines.append("")
    lines.append(f"**{recommendation}.** {rationale}")
    lines.append("")
    lines.append("Cheap vision testing should still inspect only selected crops, keep transcript snippets as grounding, and avoid full-frame/talking-head expansion unless explicitly needed.")
    lines.append("")

    lines.append("## Review checklist")
    lines.append("")
    lines.append("- [ ] Human reviewer checked top crops against `transcript-only.md`.")
    lines.append("- [ ] No SponsorBlock-excluded content was reintroduced.")
    lines.append("- [ ] Marked which crops are useful/noisy/redundant after visual inspection.")
    lines.append("- [ ] Decided whether this video should enter a cheap vision benchmark batch.")

    (bundle_dir / "comparison.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_contact_sheet(visual_dir: Path, manifest: dict[str, Any], max_width: int = 1400, thumb_width: int = 240) -> Path | None:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except Exception as exc:
        eprint(f"WARNING: --contact-sheet requested but Pillow is unavailable: {exc}")
        return None

    crops = manifest.get("crops", []) or []
    images: list[tuple[dict[str, Any], Any]] = []
    for crop in crops:
        rel = crop.get("image_path")
        if not rel:
            continue
        path = visual_dir / str(rel)
        if not path.exists():
            continue
        try:
            img = Image.open(path).convert("RGB")
            scale = thumb_width / max(1, img.width)
            thumb = img.resize((thumb_width, max(1, int(img.height * scale))))
            images.append((crop, thumb))
        except Exception as exc:
            eprint(f"WARNING: could not add crop to contact sheet ({path}): {exc}")

    if not images:
        return None

    cols = max(1, max_width // thumb_width)
    label_h = 34
    cell_h = max(img.height for _, img in images) + label_h
    rows = math.ceil(len(images) / cols)
    sheet = Image.new("RGB", (cols * thumb_width, rows * cell_h), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for idx, (crop, img) in enumerate(images):
        col = idx % cols
        row = idx // cols
        x = col * thumb_width
        y = row * cell_h
        sheet.paste(img, (x, y))
        label = f"{idx + 1:02d} {crop.get('timestamp_formatted') or fmt_timestamp(crop.get('timestamp_seconds') or 0)} score {score_value(crop):.1f}"
        draw.text((x + 4, y + img.height + 4), label[:42], fill="black", font=font)

    out = visual_dir / "contact.jpg"
    sheet.save(out, quality=88)
    return out


def process_manifest_bundle(
    bundle_dir: Path,
    visual_dir: Path,
    manifest: dict[str, Any],
    args: argparse.Namespace,
    visual_source: str,
) -> None:
    bundle_dir.mkdir(parents=True, exist_ok=True)
    segments, transcript_source = fetch_or_load_transcript(manifest, visual_dir, args)
    write_metadata(bundle_dir, manifest, visual_source, transcript_source)
    write_transcript_only(bundle_dir, manifest, segments, transcript_source)
    if args.contact_sheet:
        contact = write_contact_sheet(visual_dir, manifest)
        if contact:
            eprint(f"Wrote contact sheet: {contact}")
    write_comparison(bundle_dir, manifest, segments)


def process_url(url: str, output_root: Path, args: argparse.Namespace) -> Path:
    video_id = extract_video_id(url)
    bundle_dir = output_root / video_id
    visual_dir = bundle_dir / "visual-local"
    run_extractor(url, visual_dir, args)
    manifest = read_json(visual_dir / "manifest.json")
    process_manifest_bundle(bundle_dir, visual_dir, manifest, args, f"URL extraction/reuse: {url}")
    return bundle_dir


def process_visual_dir(src_dir: Path, output_root: Path, args: argparse.Namespace) -> Path:
    src_dir = src_dir.resolve()
    manifest = read_json(src_dir / "manifest.json")
    bundle_dir = bundle_dir_for_manifest(output_root, manifest, src_dir.name)
    visual_dir = bundle_dir / "visual-local"

    if src_dir != visual_dir.resolve():
        copy_visual_output(src_dir, visual_dir, force=args.force_extract)
        manifest = read_json(visual_dir / "manifest.json")
    process_manifest_bundle(bundle_dir, visual_dir, manifest, args, f"existing extractor output: {src_dir}")
    return bundle_dir


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build local/free transcript-only vs visual comparison bundles for youtube-visual-insights.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Examples:
              # Reuse an existing extract_visual_insights.py output directory
              python3 scripts/compare_transcript_vs_visual.py --visual-dir /tmp/ytvi-video -o /tmp/ytvi-benchmark --no-fetch-transcript

              # Run extractor for a URL list, then build comparison bundles
              python3 scripts/compare_transcript_vs_visual.py --urls-file videos.txt -o /tmp/ytvi-benchmark --contact-sheet

              # Re-run extraction if a bundle already contains visual-local/manifest.json
              python3 scripts/compare_transcript_vs_visual.py https://youtu.be/VIDEO_ID -o /tmp/ytvi-benchmark --force-extract
            """
        ),
    )
    parser.add_argument("inputs", nargs="*", help="YouTube URLs/video IDs or existing extractor output directories.")
    parser.add_argument("--urls-file", action="append", help="File containing one YouTube URL or video ID per line; # comments allowed.")
    parser.add_argument("--visual-dir", action="append", help="Existing extract_visual_insights.py output directory to reuse.")
    parser.add_argument("--output", "-o", default=None, help="Benchmark output root (default: temp ytvi-compare-* directory).")
    parser.add_argument("--contact-sheet", action="store_true", help="Also write visual-local/contact.jpg from crop images when Pillow is available.")
    parser.add_argument("--no-fetch-transcript", action="store_true", help="Do not call yt-dlp for full captions; use existing SRT or manifest snippets only.")
    parser.add_argument("--force-extract", action="store_true", help="Overwrite/re-run visual-local extraction/copy instead of reusing existing bundle files.")
    parser.add_argument("--extract-script", default=str(DEFAULT_EXTRACT_SCRIPT), help="Path to extract_visual_insights.py.")

    # Extractor pass-through settings used only for URL inputs.
    parser.add_argument("--lang", default="auto", help="Caption language for URL extraction/fetching (default: auto).")
    parser.add_argument("--sample-interval", type=float, default=None, help="Pass-through to extractor for URL inputs.")
    parser.add_argument("--max-candidates", type=int, default=160, help="Pass-through to extractor for URL inputs (default: 160).")
    parser.add_argument("--max-kept", type=int, default=12, help="Pass-through to extractor for URL inputs (default: 12).")
    parser.add_argument("--manual-targets", default=None, help="Pass-through to extractor for URL inputs.")
    parser.add_argument("--sponsorblock-categories", default=DEFAULT_SB_CATEGORIES, help="Pass-through to extractor/SponsorBlock filtering.")
    parser.add_argument("--skip-sponsorblock", action="store_true", help="Pass-through to extractor; disables SponsorBlock filtering for URL inputs.")
    parser.add_argument("--transcript-window", type=float, default=5.0, help="Pass-through to extractor for URL inputs (default: 5).")
    parser.add_argument("--extract-debug", action="store_true", help="Run extractor with --debug for URL inputs.")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    urls, visual_dirs = classify_inputs(args)
    if not urls and not visual_dirs:
        parser.error("provide at least one URL/video ID, --urls-file, or --visual-dir")

    if args.output:
        output_root = Path(args.output).expanduser().resolve()
    else:
        output_root = Path(tempfile.mkdtemp(prefix="ytvi-compare-"))
    output_root.mkdir(parents=True, exist_ok=True)

    bundles: list[Path] = []
    for visual_dir in visual_dirs:
        bundles.append(process_visual_dir(visual_dir, output_root, args))
    for url in urls:
        bundles.append(process_url(url, output_root, args))

    eprint("")
    eprint("Comparison bundles written:")
    for bundle in bundles:
        eprint(f"  {bundle}")
        eprint(f"    {bundle / 'transcript-only.md'}")
        eprint(f"    {bundle / 'comparison.md'}")


if __name__ == "__main__":
    main()
