# Resolution mode benchmark

Date: 2026-06-13

Benchmarked `extract_visual_insights.py` quality modes for local crop extraction:

- `--quality fast` = 720p-or-lower selector
- `--quality high` = 1080p-or-lower selector
- `--quality max` = best available selector

No vision/model calls were made. All generated media artifacts were kept under `/tmp` only.

## Inputs and commands

Output root:

```text
/tmp/ytvi-resolution-benchmark-20260613-140055/
```

Videos:

- `https://youtu.be/y0PnZi9Mzv0`
- `https://youtu.be/5gfcLreD2ZM`

For `y0PnZi9Mzv0`, each mode used the same manual targets:

```text
00:54,01:31,01:41,01:51,02:01,02:56,05:01,05:06,05:16,05:21,05:26,05:31,05:36
```

Command shape:

```bash
uv run skills/youtube-visual-insights/scripts/extract_visual_insights.py \
  "https://youtu.be/y0PnZi9Mzv0" \
  --quality <fast|high|max> \
  --manual-targets "00:54,01:31,01:41,01:51,02:01,02:56,05:01,05:06,05:16,05:21,05:26,05:31,05:36" \
  --max-kept 13 \
  --keep-video \
  -o /tmp/ytvi-resolution-benchmark-20260613-140055/y0PnZi9Mzv0-<mode>
```

For `5gfcLreD2ZM`, each mode used default automatic timestamp selection with `--max-kept 8`:

```bash
uv run skills/youtube-visual-insights/scripts/extract_visual_insights.py \
  "https://youtu.be/5gfcLreD2ZM" \
  --quality <fast|high|max> \
  --max-kept 8 \
  --keep-video \
  -o /tmp/ytvi-resolution-benchmark-20260613-140055/5gfcLreD2ZM-<mode>
```

`--keep-video` was used so temporary source-video file sizes were observable. Contact sheets were generated after extraction at `<run>/contact.jpg`.

## Summary metrics

| Video | Mode | Runtime | Kept source video | Manifest source dimensions | Crop count | Average crop file size | Contact sheet |
|---|---:|---:|---:|---:|---:|---:|---|
| `5gfcLreD2ZM` | fast | 32.67s | 71.6 MiB | 1280x720 | 8 | 59.4 KiB | `/tmp/ytvi-resolution-benchmark-20260613-140055/5gfcLreD2ZM-fast/contact.jpg` |
| `5gfcLreD2ZM` | high | 40.34s | 115.9 MiB | 1920x1080 | 8 | 109.0 KiB | `/tmp/ytvi-resolution-benchmark-20260613-140055/5gfcLreD2ZM-high/contact.jpg` |
| `5gfcLreD2ZM` | max | 36.69s | 115.9 MiB | 1920x1080 | 8 | 109.0 KiB | `/tmp/ytvi-resolution-benchmark-20260613-140055/5gfcLreD2ZM-max/contact.jpg` |
| `y0PnZi9Mzv0` | fast | 21.93s | 48.9 MiB | 1280x720 | 13 | 42.2 KiB | `/tmp/ytvi-resolution-benchmark-20260613-140055/y0PnZi9Mzv0-fast/contact.jpg` |
| `y0PnZi9Mzv0` | high | 24.16s | 72.3 MiB | 1920x1080 | 13 | 79.6 KiB | `/tmp/ytvi-resolution-benchmark-20260613-140055/y0PnZi9Mzv0-high/contact.jpg` |
| `y0PnZi9Mzv0` | max | 20.99s | 72.3 MiB | 1920x1080 | 13 | 79.6 KiB | `/tmp/ytvi-resolution-benchmark-20260613-140055/y0PnZi9Mzv0-max/contact.jpg` |

Selected yt-dlp video formats:

| Video | Mode | Format id | Format note | Dimensions | Codec/FPS |
|---|---:|---:|---|---:|---|
| `5gfcLreD2ZM` | fast | 398 | 720p60 | 1280x720 | AV1 / 60fps |
| `5gfcLreD2ZM` | high | 399 | 1080p60 | 1920x1080 | AV1 / 60fps |
| `5gfcLreD2ZM` | max | 399 | 1080p60 | 1920x1080 | AV1 / 60fps |
| `y0PnZi9Mzv0` | fast | 398 | 720p | 1280x720 | AV1 / 25fps |
| `y0PnZi9Mzv0` | high | 399 | 1080p | 1920x1080 | AV1 / 25fps |
| `y0PnZi9Mzv0` | max | 399 | 1080p | 1920x1080 | AV1 / 25fps |

In this fixture set, `max` resolved to the same 1080p format as `high` for both videos.

## Crop dimensions and file sizes

The crop geometry scales directly with source resolution:

- 720p `right_38`: `486x662`
- 1080p `right_38`: `729x993`
- 720p `right_45`: `576x648`
- 1080p `right_45`: `864x972`

Average crop JPEG sizes roughly doubled when moving from 720p to 1080p:

- `y0PnZi9Mzv0`: 42.2 KiB -> 79.6 KiB
- `5gfcLreD2ZM`: 59.4 KiB -> 109.0 KiB

Detailed per-crop metrics are in `/tmp/ytvi-resolution-benchmark-20260613-140055/metrics.md` while the `/tmp` artifacts remain available.

## Crop selection differences

`5gfcLreD2ZM`:

- Crop timestamps and selected regions were identical across all modes.
- Perceptual hashes were identical or effectively identical between `fast` and `high`/`max`.
- `high` and `max` were identical because both selected the same 1080p source stream.

`y0PnZi9Mzv0`:

- All modes kept all 13 manual timestamps.
- `high` and `max` were identical.
- `fast` differed at one timestamp: `00:01:41` selected `bottom_right` (`614x417`), while `high`/`max` selected `right_38` (`729x993`). The 1080p crop was visually better: it included the full palette card instead of clipping it near the top-right.
- Remaining timestamps selected the same regions, with proportional 720p vs 1080p dimensions.

## Visual/readability observations from contact sheets

`y0PnZi9Mzv0` contains color wheel, palette, and interior reference images. At contact-sheet scale, 720p is already good enough to identify the visual examples, major hues, layout, and room type. 1080p improves edge crispness and makes fine palette blocks/textures cleaner. The only materially important selection difference was the `00:01:41` palette card, where 1080p produced a better crop region.

`5gfcLreD2ZM` contains interiors, architecture, wood-tone/material palette imagery, and decor shots. At 720p, all eight selected crops are readable enough for downstream qualitative visual insight extraction. The 1080p versions are sharper and preserve more detail in bookshelves, wood grain, copper pots, foliage, and palette labels, but do not change which visual examples would be described.

## Runtime and disk tradeoff

For these two videos, 1080p source downloads were about 1.5x larger than 720p source downloads:

- `y0PnZi9Mzv0`: 48.9 MiB -> 72.3 MiB
- `5gfcLreD2ZM`: 71.6 MiB -> 115.9 MiB

Runtime differences were modest and noisy. `high` was slower than `fast` in both direct comparisons, but `max` matched `high`'s stream and happened to run slightly faster in this single-run sample. Treat these wall-clock numbers as indicative, not statistically stable.

## Recommendation

Keep `high` as the default quality mode.

Rationale:

- It gives a meaningful quality margin for palette/detail-heavy videos.
- It avoids the one observed 720p crop-selection regression in `y0PnZi9Mzv0`.
- It is still bounded to 1080p, avoiding unbounded `max` behavior on videos with 1440p/4K sources.
- In this fixture set, downstream insight quality would usually be similar from 720p, but 1080p is safer for small text, material swatches, image grids, texture, and palette details.

Use `fast` when batch throughput, temporary disk usage, or cheap broad triage matters more than fidelity. Reserve `max` for one-off forensic/detail inspection or future benchmark cases where the available source is above 1080p and the extra resolution is expected to change interpretation.
