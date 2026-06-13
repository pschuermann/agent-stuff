# Benchmark: youtube-visual-insights

Use this fixture to tune local/free crop extraction before adding any model calls.

## Primary Fixture

| Property | Value |
|---|---|
| URL | `https://youtu.be/y0PnZi9Mzv0` |
| Video ID | `y0PnZi9Mzv0` |
| Title | `how to use color in interior design` |
| Duration | ~18:26 |
| Captions | auto captions available |
| SponsorBlock | known sponsor segment around `11:36.277–14:25.675` |

## Gold Visual Targets

The first hand-labeled targets from review:

```text
00:54
01:31
01:41
01:51-02:01   # annotation evolves; ideally keep changed annotation, dedupe repeated states
02:56          # crop the example, not the creator
05:01
05:06
05:16
05:21
05:26
05:31
05:36
```

Recommended manual benchmark command:

```bash
uv run skills/youtube-visual-insights/scripts/extract_visual_insights.py \
  "https://youtu.be/y0PnZi9Mzv0" \
  --manual-targets 00:54,01:31,01:41,01:51,02:01,02:56,05:01,05:06,05:16,05:21,05:26,05:31,05:36 \
  --max-kept 20 \
  --debug \
  -o /tmp/ytvi-color-benchmark
```

Default automatic benchmark command:

```bash
uv run skills/youtube-visual-insights/scripts/extract_visual_insights.py \
  "https://youtu.be/y0PnZi9Mzv0" \
  --max-candidates 160 \
  --max-kept 16 \
  -o /tmp/ytvi-color-auto
```

## What to Inspect

- `report.md`: do the embedded crops show the color wheels, palette annotations, interior example photos, and moodboard examples rather than the creator's face?
- `manifest.json`: no crop should have `sponsorblock_overlap: true`.
- `debug/frames/`: raw frames should include target moments when `--manual-targets` is used.
- Dedupe: repeated appearances of the same interior should collapse unless the annotation/visual state changed.

## Metrics

| Metric | Target |
|---|---|
| Target recall | manual benchmark captures all listed target moments unless SponsorBlock-skipped |
| Crop quality | crop focuses on the visual example/annotation/UI, not full talking-head frame |
| Sponsor leakage | zero kept crops inside sponsor,selfpromo,interaction,intro,outro ranges |
| Duplicate rate | repeated same image states are collapsed where practical |
| Runtime | bounded by `--max-candidates`; suitable for async use on >1h videos |
| Disk use | default output stores crops only; raw frames only with `--debug` |

## Long Video Test

For a >1h video, verify the manifest timestamps cover the full non-skipped duration, not only the beginning:

```bash
uv run skills/youtube-visual-insights/scripts/extract_visual_insights.py \
  "https://www.youtube.com/watch?v=<long-video-id>" \
  --max-candidates 160 \
  --max-kept 24 \
  -o /tmp/ytvi-long
```

Acceptance: kept crops should be distributed across the whole talk. The timestamp cap must be applied after spreading samples across allowed time.

## Non-English Test

```bash
uv run skills/youtube-visual-insights/scripts/extract_visual_insights.py \
  "https://www.youtube.com/watch?v=<non-english-video-id>" \
  --lang de \
  --max-kept 12 \
  -o /tmp/ytvi-de
```

Acceptance: transcript snippets in `report.md` and `manifest.json` remain in the selected caption language. If requested captions are unavailable, the script should fall back to available captions and record the effective language in the manifest.

## SponsorBlock Test

```bash
uv run skills/youtube-visual-insights/scripts/extract_visual_insights.py \
  "https://youtu.be/y0PnZi9Mzv0" \
  --manual-targets 12:09 \
  --debug \
  -o /tmp/ytvi-sponsor-test
```

Acceptance: `12:09` is skipped because it falls in the SponsorBlock sponsor segment. Original timestamps remain unchanged; the video is not re-timed.
