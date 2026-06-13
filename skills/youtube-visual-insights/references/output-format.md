# Output Format: youtube-visual-insights

`extract_visual_insights.py` writes a human-reviewable Markdown report plus a machine-readable manifest. The report intentionally embeds **crops only**; raw full frames are retained only with `--debug`.

## Directory Layout

```text
<output-dir>/
├── report.md
├── manifest.json
├── crops/
│   └── 001_00m54s000ms_right_38.jpg
└── debug/                    # only with --debug
    ├── frames/               # raw full frames used for troubleshooting
    ├── <video>.<lang>.srt
    ├── sponsorblock.json       # API response, or status/error when unavailable
    └── source_video.mp4        # only if a temporary video was downloaded with --debug
```

## report.md

Each crop section contains:

```markdown
## 00:00:54

> Transcript text near the crop timestamp.

- **Crop:** `right_38` score `31.2`
- **Keep reason:** best local crop candidate (right_38), score 31.2

![Crop at 00:00:54](crops/001_00m54s000ms_right_38.jpg)
```

The transcript window defaults to a small context-efficient range around the timestamp and can be adjusted with `--transcript-window`.

## manifest.json

Top-level fields:

```json
{
  "video_id": "y0PnZi9Mzv0",
  "video_title": "how to use color in interior design",
  "video_url": "https://www.youtube.com/watch?v=y0PnZi9Mzv0",
  "duration_seconds": 1106,
  "uploader": "Noah Daniel",
  "language": "en",
  "translate_language": null,
  "selected_quality": "high",
  "yt_dlp_format_selector": "bv*[height<=1080]+ba/b[height<=1080]/best[height<=1080]/best",
  "format_override": null,
  "source_video_dimensions": {"w": 1920, "h": 1080},
  "source_video_format": {
    "format_id": "137",
    "format_note": "1080p",
    "ext": "mp4",
    "width": 1920,
    "height": 1080,
    "resolution": "1920x1080",
    "fps": 30,
    "vcodec": "avc1.640028"
  },
  "sponsorblock_categories_skipped": ["sponsor", "selfpromo", "interaction", "intro", "outro"],
  "sponsorblock_segments": [{"start": 696.277, "end": 865.675, "category": "sponsor"}],
  "crops": [],
  "generated_at": "2026-06-13T12:34:56Z"
}
```

Crop entries:

```json
{
  "timestamp_seconds": 54.0,
  "timestamp_formatted": "00:00:54",
  "image_path": "crops/001_00m54s000ms_right_38.jpg",
  "crop_region": {"x": 529, "y": 19, "w": 325, "h": 441},
  "crop_dimensions": {"w": 325, "h": 441},
  "region_name": "right_38",
  "score": 31.2,
  "hash": "ff8a...",
  "cluster_id": 3,
  "keep_reason": "best local crop candidate (right_38), score 31.2",
  "source_size": {"w": 854, "h": 480},
  "transcript_text": "...",
  "transcript_segments": [{"start": 51.0, "end": 57.0, "text": "..."}],
  "sponsorblock_overlap": false
}
```

## Debug Artifacts

- `debug/frames/`: raw full frames extracted from video. These are omitted by default to save disk and avoid feeding full talking-head frames into downstream context.
- `debug/*.srt`: downloaded captions used for transcript association.
- `debug/sponsorblock.json`: SponsorBlock response for the configured skip categories, or a small status/error object if the request was skipped or unavailable.
- `debug/source_video.*`: selected temporary source video, only when a local source download was performed while `--debug` was enabled.

## Notes

- Timestamps always refer to the original YouTube timeline. SponsorBlock ranges are skipped during candidate selection and transcript association; the video is not cut/re-timed.
- `selected_quality` records the requested `--quality` mode (`fast`, `high`, or `max`). If `--format` is supplied, `yt_dlp_format_selector` records the override actually used and `format_override` records the same user-supplied selector.
- `source_video_dimensions` and `source_video_format` are populated from yt-dlp's selected video stream when available, with a fallback to the extracted frame size for dimensions.
- Non-English captions are preserved in their source language unless a future summarization layer chooses to translate them.
- Hash/cluster fields are for local duplicate suppression and later pipeline use; they are not semantic identities.
