---
name: youtube-visual-insights
description: "Extract cropped visual examples from YouTube videos, aligned with transcript snippets. Local/free — no API keys required. Use when the user wants visual insights, screenshots, or frame captures from a YouTube video, or wants to see what a video looks like at key moments alongside the transcript. Trigger on phrases like 'extract frames from this YouTube video', 'show me visual highlights of', 'get screenshots from', 'what does this video look like at...', or when analyzing a YouTube video that has visual content worth capturing."
---

# YouTube Visual Insights

Local/free extraction of visual crop examples from YouTube videos. Uses `yt-dlp` for metadata/captions/media, `ffmpeg` for frame extraction, SponsorBlock's public API to skip ad/interaction segments, and Pillow for cropping. For many candidate frames it downloads one bounded-quality temporary video for fast local seeking, then deletes it unless `--keep-video` is set. Emits a Markdown report with crops and transcript snippets, plus a JSON manifest.

## Prerequisites

Install the required CLI tools (one-time):

```bash
# macOS
brew install yt-dlp ffmpeg

# pip (any platform)
pip install yt-dlp
# ffmpeg must be installed separately (brew, apt, choco, or from ffmpeg.org)
```

The script itself runs via `uv` (inline dependencies — no pip install needed):
```bash
# uv should already be available; if not:
brew install uv  # or: pip install uv
```

## Quick Start

```bash
# Extract 12 visual crops from a YouTube video
uv run {baseDir}/scripts/extract_visual_insights.py "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Specify output directory
uv run {baseDir}/scripts/extract_visual_insights.py "https://youtu.be/dQw4w9WgXcQ" -o /tmp/my-video-insights

# Non-English captions (German)
uv run {baseDir}/scripts/extract_visual_insights.py "https://www.youtube.com/watch?v=..." --lang de

# More crops for a longer video; use fast mode to bound disk/time at 720p-or-lower
uv run {baseDir}/scripts/extract_visual_insights.py "https://www.youtube.com/watch?v=..." --quality fast --max-kept 20 --max-candidates 200

# Highest available local source stream for maximum crop detail
uv run {baseDir}/scripts/extract_visual_insights.py "https://www.youtube.com/watch?v=..." --quality max

# Advanced yt-dlp format selector override
uv run {baseDir}/scripts/extract_visual_insights.py "https://www.youtube.com/watch?v=..." --format "bv*[height<=1440]+ba/b[height<=1440]/best"

# Benchmark/tuning: extract specific timestamps
uv run {baseDir}/scripts/extract_visual_insights.py "https://www.youtube.com/watch?v=..." --manual-targets 83.4,240.0,512.7

# Debug mode (keep raw frames, captions, SponsorBlock data)
uv run {baseDir}/scripts/extract_visual_insights.py "https://www.youtube.com/watch?v=..." --debug
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `url` | (required) | YouTube URL (`watch?v=`, `youtu.be`, `shorts/`, `embed/`) or raw 11-char video ID |
| `--lang` | `auto` | Caption language ISO code (`en`, `de`, `ja`, `ko`, etc.). `auto` detects and picks the best available track (prefers manual subs over auto-generated, English as fallback) |
| `--translate-lang` | none | Additional caption language to download alongside primary captions when yt-dlp exposes one. Does not change the transcript text in the report — with `--debug`, downloaded caption files are kept in `debug/` |
| `--sample-interval` | duration-scaled | Target seconds between frame samples. Defaults: ~8s for videos up to 30m, ~12s up to 1h, ~20s up to 2h, ~30s beyond that; capped by `--max-candidates` |
| `--max-candidates` | `160` | Maximum frames to extract. The cap is spread across the whole non-SponsorBlock timeline so >1h videos are not sampled only at the beginning |
| `--max-kept` | `12` | Maximum crops to include in the report after local scoring and dedupe |
| `--quality` | `high` | Video quality mode for extraction: `fast` = 720p-or-lower for speed/disk, `high` = 1080p-or-lower for better crops, `max` = best available video stream |
| `--format` | none | Advanced yt-dlp format selector override. When set, this exact selector is used for metadata format probing, stream URL extraction, and temporary downloads instead of the `--quality` selector |
| `--output` / `-o` | temp dir | Output directory for all artifacts. Default: `$TMPDIR/ytvi-{video_id}-{rand}/` |
| `--keep-video` | off | Keep the temporary downloaded source video instead of deleting it after frame extraction |
| `--debug` | off | Keep raw full frames, SRT caption files, SponsorBlock response/status, and any temporary downloaded source video in `debug/` |
| `--manual-targets` | none | Comma-separated timestamps in seconds (e.g. `83.4,240.0,512.7`). Overrides automatic timestamp distribution — useful for benchmarking and tuning |
| `--sponsorblock-categories` | `sponsor,selfpromo,interaction,intro,outro` | Comma-separated SponsorBlock categories to skip. Frames falling in these segments are rejected |
| `--skip-sponsorblock` | off | Disable SponsorBlock filtering entirely. All frames are candidates |
| `--transcript-window` | `5` | Seconds before/after each crop timestamp to pull transcript text. Larger windows capture more context |

## Output

After a successful run, the output directory contains:

```
<output-dir>/
├── report.md         # Markdown report: title, per-crop H2 timestamps, transcript blockquotes, embedded images
├── manifest.json     # Full structured JSON (see references/output-format.md for schema)
├── crops/            # Cropped frame images
│   ├── 001_00m54s000ms_right_38.jpg
│   ├── 002_01m31s000ms_right_45.jpg
│   └── ...
└── debug/            # Only with --debug
    ├── frames/       # Original full-resolution extracted frames
    ├── <video>.<lang>.srt  # Downloaded subtitle file(s)
    ├── sponsorblock.json  # SponsorBlock API response/status
    └── source_video.mp4    # Only when a temporary source video was downloaded with --debug
```

The **report.md** is the primary output. Each crop gets an H2 heading with its timestamp, a blockquote of the transcript text near that moment, and one embedded crop image. Full frames are kept only in `debug/` when requested.

The **manifest.json** contains the same data in machine-readable form with exact timestamps, selected quality/yt-dlp format selector, source video dimensions when available, crop coordinates/dimensions, SponsorBlock segment info, and metadata. See `references/output-format.md` for the full schema.


## Workflow

### 1. Quick visual overview
```bash
uv run {baseDir}/scripts/extract_visual_insights.py "<youtube-url>" -o /tmp/video-insights
```
Open `/tmp/video-insights/report.md` in a Markdown viewer, or inspect `manifest.json`.

### 2. Long video (>1 hour)
Sampling is bounded for long videos and spread across the entire non-SponsorBlock timeline. If you need finer granularity, set `--sample-interval` explicitly and raise `--max-candidates`:
```bash
uv run {baseDir}/scripts/extract_visual_insights.py "<url>" --sample-interval 30 --max-kept 24
```

### 3. Non-English captions
Use `--lang` to request a specific language. If the video has no captions in that language, the script falls back to auto-detection:
```bash
uv run {baseDir}/scripts/extract_visual_insights.py "<url>" --lang ja
```
For videos with auto-generated captions only, the script automatically uses them when no manual subs are available.

### 4. Benchmarking and tuning
Use `--manual-targets` to test specific moments and `--debug` to inspect raw frames:
```bash
uv run {baseDir}/scripts/extract_visual_insights.py "<url>" \
  --manual-targets 60.0,120.5,300.0 \
  --debug \
  -o /tmp/bench-run
```
See `references/benchmark.md` for a reference video fixture and expected results.

### 5. Compare transcript-only vs local visual output
Use the Plan A comparison harness to create a local/free benchmark bundle. It reuses existing extractor outputs when available and does not call vision models:
```bash
python3 {baseDir}/scripts/compare_transcript_vs_visual.py \
  --visual-dir /tmp/bench-run \
  --output /tmp/ytvi-benchmark \
  --contact-sheet
```

Or run from a URL list; each video gets `metadata.json`, `transcript-only.md`, `visual-local/report.md`, `visual-local/manifest.json`, optional `visual-local/contact.jpg`, and `comparison.md`:
```bash
python3 {baseDir}/scripts/compare_transcript_vs_visual.py \
  --urls-file videos.txt \
  --output /tmp/ytvi-benchmark
```

See `references/compare-transcript-vs-visual.md` for the workflow, output layout, and SponsorBlock notes.

## How It Works

The pipeline has 11 stages:

1. **Video ID extraction** — parses YouTube URLs (`watch?v=`, `youtu.be`, `shorts/`, `embed/`) into 11-character IDs
2. **Metadata** — `yt-dlp --dump-json` for title, duration, uploader
3. **SponsorBlock** — queries `sponsor.ajay.app/api/skipSegments` to identify ad/interaction segments; frames and transcript snippets overlapping these segments are rejected
4. **Captions** — `yt-dlp --write-auto-subs --sub-langs {lang}` downloads and parses SRT subtitles
5. **Timestamp selection** — distributes timestamps evenly across the effective (non-SponsorBlock) duration, with bounded candidate counts for >1h videos
6. **Frame extraction** — for small target sets, `yt-dlp -g` can seek the selected stream directly; for many candidates, the script downloads one temporary video with the selected `--quality`/`--format` selector and uses fast local `ffmpeg -ss {ts}` seeks. The temporary source video is deleted after extraction unless `--keep-video` is set, or kept in `debug/` when `--debug` is enabled
7. **Crop generation** — Pillow scores local crop candidates (right-side, center, left-side, top/bottom variants), dedupes near-identical crops, and keeps crops only
8. **Transcript association** — each crop is aligned with nearby caption segments (± `--transcript-window` seconds), with overlapping caption text compacted so report snippets do not stutter repeated phrases
9. **Markdown report** — `report.md` with H1 title, per-crop sections, blockquoted transcript, and embedded images
11. **Cleanup** — removes temporary raw frames/source video downloads and, unless `--debug` is enabled, caption/debug artifacts

## Tips

- **Long videos**: Set `--max-kept` higher (e.g. 24-48) for 2h+ content. The auto-scaled interval keeps the frame budget manageable.
- **No captions**: The script gracefully degrades — crops still emit, just without transcript text. This is common for music videos or content without subtitles.
- **SponsorBlock coverage**: New or niche videos may have no SponsorBlock segments. The script proceeds unfiltered with a warning — this is expected and fine.
- **Frame quality**: Frames are extracted with `--quality high` by default (`1080p`-or-lower). Use `--quality fast` for the previous 720p-or-lower speed/disk profile, `--quality max` for the best available video stream, or `--format` for an advanced yt-dlp selector.
- **Stream URL expiry**: YouTube stream URLs can expire. The script fetches the URL once and extracts all frames promptly. If it expires mid-run, remaining frames will fail individually without crashing the whole run.
- **Local heuristic cropping**: This skill uses cheap image statistics and geometric crop candidates, not a vision model. It is designed to prefer slide/photo/UI regions over full talking-head frames, but it can still miss unusual layouts. Future enhancement: optional cheap OpenRouter/local CLIP routing for uncertain crops.

## Supported URL Formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/shorts/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`
- Raw 11-character video ID (e.g. `dQw4w9WgXcQ`)

## Edge Cases & Error Handling

| Situation | Behavior |
|-----------|----------|
| `yt-dlp` or `ffmpeg` not installed | Prints install instructions to stderr, exits 1 |
| Video unavailable or private | Exits 1 with clear message |
| No captions available | Warns, emits crops without transcript (still valid output) |
| SponsorBlock API down/times out | Warns, proceeds with unfiltered timestamps |
| SponsorBlock returns 404 (no segments) | Silent — normal for un-submitted videos |
| Individual frame extraction fails | Warns, skips that timestamp, continues with remaining |
| Stream URL expires mid-run | Remaining frames fail individually; partial output still emitted |
| All timestamps in SponsorBlock segments | Exits 1 with error message |
| `--manual-targets` with non-numeric values | Exits 1 with error message |

## Limitations

- **No vision model by default**: Crop selection is local/free and heuristic. It cannot understand objects semantically; documented future path is optional low-cost model routing for videos worth deeper extraction.
- **YouTube only**: No Vimeo, Twitch, or other platform support.
- **No audio extraction**: Transcript comes from YouTube captions (manual or auto-generated), not local speech-to-text.
- **Single-frame crops**: Each timestamp gets one frame. No multi-frame sequences or GIF export.
- **SponsorBlock is crowd-sourced**: Segments may be incomplete or missing for new/niche videos.
