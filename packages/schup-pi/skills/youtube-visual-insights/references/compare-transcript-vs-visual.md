# Transcript-only vs Local Visual Comparison Harness

`compare_transcript_vs_visual.py` is the Plan A local/free benchmark harness for comparing:

- **Mode 0:** transcript-only baseline
- **Mode 1:** local visual crops from `extract_visual_insights.py`

It does **not** call a vision model. For URL inputs it may run the local extractor, which uses `yt-dlp`, `ffmpeg`, and SponsorBlock. For existing extractor output directories it reuses `manifest.json`, `report.md`, and `crops/` instead of re-extracting.

## Output bundle

Each video is written under `<benchmark-root>/<video_id>/`:

```text
<video_id>/
├── metadata.json
├── transcript-only.md
├── visual-local/
│   ├── report.md
│   ├── manifest.json
│   ├── crops/
│   └── contact.jpg          # optional with --contact-sheet
└── comparison.md
```

`comparison.md` answers:

1. What transcript-only missed.
2. What local crops add for human review.
3. Useful/noisy/redundant crop notes from local manifest heuristics.
4. Transcript association quality.
5. Whether the video is worth cheap vision testing.

Because this is still Mode 1, crop notes are heuristic: scores, transcript availability, clusters/hashes, and SponsorBlock flags. A human should inspect the crops before treating visual claims as ground truth.

## Reuse an existing extractor output

Use this when you already have an `extract_visual_insights.py` output directory:

```bash
python3 skills/youtube-visual-insights/scripts/compare_transcript_vs_visual.py \
  --visual-dir /tmp/ytvi-existing-output \
  --output /tmp/ytvi-benchmark \
  --contact-sheet
```

If you need a fully offline/local-file smoke test, add `--no-fetch-transcript`; then the harness uses any existing SRT files or manifest crop-associated transcript snippets only:

```bash
python3 skills/youtube-visual-insights/scripts/compare_transcript_vs_visual.py \
  --visual-dir /tmp/ytvi-existing-output \
  --output /tmp/ytvi-benchmark \
  --no-fetch-transcript
```

## Run from a URL list

Create a list with one URL or raw video ID per line. Blank lines and `#` comments are ignored:

```text
https://youtu.be/8QQoy4X-VnQ
https://youtu.be/Luay8JPBykQ
# https://youtu.be/y0PnZi9Mzv0
```

Run the harness:

```bash
python3 skills/youtube-visual-insights/scripts/compare_transcript_vs_visual.py \
  --urls-file videos.txt \
  --output /tmp/ytvi-benchmark \
  --contact-sheet
```

For each URL, the harness writes or reuses `<output>/<video_id>/visual-local/`. If `visual-local/manifest.json` and `visual-local/report.md` already exist, extraction is skipped. Use `--force-extract` to overwrite/re-run.

Extractor options can be passed through for URL inputs:

```bash
python3 skills/youtube-visual-insights/scripts/compare_transcript_vs_visual.py \
  https://youtu.be/y0PnZi9Mzv0 \
  --output /tmp/ytvi-benchmark \
  --max-kept 20 \
  --max-candidates 240 \
  --sponsorblock-categories sponsor,selfpromo,interaction,intro,outro
```

## SponsorBlock behavior

The harness preserves the extractor's SponsorBlock exclusions:

- Existing `manifest.json` `sponsorblock_segments` are copied into `metadata.json`.
- `transcript-only.md` filters downloaded or existing SRT transcript segments that overlap those ranges.
- `comparison.md` reports the number/category of skipped ranges and flags any manifest crop marked as overlapping.

Do not use `--skip-sponsorblock` for benchmark runs unless the comparison is explicitly meant to include sponsor/self-promo/interaction segments.

## Cheap vision routing decision

`comparison.md` includes a conservative recommendation:

- **Yes** when there are enough crops, reasonable transcript association, and moderate/high crop scores.
- **Maybe** when crops exist but need spot-checking.
- **No / low priority** when there are too few useful crops or weak transcript alignment.

This recommendation is only for selecting candidates for a future Mode 2 cheap vision benchmark; it does not perform the model call.
