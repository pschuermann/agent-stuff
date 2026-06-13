# Plan A: Visual Extraction Benchmark

Compact design doc for evaluating whether visual crops improve YouTube video insight extraction compared with transcript-only workflows.

## Core Question

Does adding extracted still-image crops improve downstream summaries, insights, best-practice extraction, and embeddings enough to justify the added runtime, disk, and optional model cost?

We compare:

1. **Transcript-only** — current baseline: transcript → summary/insights.
2. **Local visuals, no model** — transcript + selected crops + nearby transcript snippets.
3. **Cheap vision pass** — transcript + crops + cheap vision-model crop labels/captions/observations.
4. **Routed deep pass** — only for high-value videos/crops where cheap/local confidence is insufficient.

Default must remain local/free. Model modes are optional benchmark variants.

## Video Set

Initial user-provided batch:

```text
https://youtu.be/8QQoy4X-VnQ
https://youtu.be/Luay8JPBykQ
https://youtu.be/BBkwTKPwJUI
https://youtu.be/Sz4TC-VJ2PQ
https://youtu.be/M_qcIrMuLzY
https://youtu.be/4YhloAOYnbU
https://youtu.be/1pYtVdARIRE
```

Existing fixtures:

```text
https://youtu.be/y0PnZi9Mzv0   # color/interior design, hand-labeled targets
https://youtu.be/5gfcLreD2ZM   # material palettes fixture
```

Later add at least one >1h talk, one non-English video, one slide-heavy lecture, and one code/screen-share tutorial.

## Benchmark Modes

### Mode 0: Transcript-only baseline

Inputs:
- captions/transcript only
- SponsorBlock text ranges skipped

Outputs:
- summary
- best practices/principles
- timestamped claims

Purpose: establish what can be learned without visuals.

### Mode 1: Local visual extraction

Inputs:
- transcript
- local crops from `youtube-visual-insights`
- no model calls

Outputs:
- `report.md`
- `manifest.json`
- crop contact sheet
- extracted crop timestamps and transcript snippets

Purpose: test crop coverage, dedupe, and whether the raw visual artifact is useful for human review and later embedding.

### Mode 2: Cheap vision enrichment

Inputs:
- selected crops only, not full frames
- nearby transcript snippets

Candidate cheap/OpenRouter vision models to benchmark first:
- `openrouter/google/gemini-3.1-flash-lite`
- `openrouter/google/gemini-2.5-flash-lite`
- `openrouter/moonshotai/kimi-k2.5` or `openrouter/moonshotai/kimi-k2.6` if pricing/latency is acceptable

Prompt target per crop:

```json
{
  "visual_description": "what is shown, concise",
  "design_relevance": "why this visual matters in context",
  "principles": ["generalizable lesson, not video-specific"],
  "evidence": "visible details + transcript cue",
  "confidence": 0.0,
  "needs_deep_review": false
}
```

Purpose: test whether cheap models can turn crops into useful, embeddable visual insights.

### Mode 3: Routed deep review

Only run when:
- cheap model confidence is low but crop score is high
- crop appears central to a video’s lesson
- video has high downstream value
- user explicitly requests deep extraction

Deep mode is for quality comparison and routing thresholds, not default operation.

## Output Bundle Per Video

```text
benchmark/<video_id>/
├── metadata.json
├── transcript-only.md
├── visual-local/
│   ├── report.md
│   ├── manifest.json
│   └── contact.jpg
├── visual-cheap/
│   ├── crop-insights.jsonl
│   └── visual-summary.md
└── comparison.md
```

`comparison.md` is the main review artifact.

## Evaluation Rubric

Score each video 1–5 on:

| Dimension | Question |
|---|---|
| Visual recall | Did crops capture the important on-screen examples? |
| Crop focus | Did crops avoid talking-head/background and focus on useful content? |
| Transcript alignment | Does nearby transcript explain what the crop is showing? |
| Added insight | Did visuals reveal useful information absent from transcript-only? |
| Generalizable principles | Did outputs produce reusable best practices, not one-off descriptions? |
| Hallucination control | Are visual claims grounded in crop + transcript evidence? |
| Cost/runtime | Is the mode cheap/fast enough for scheduled batch use? |
| Embedding value | Would the visual insight record be useful in search/RAG/skill creation? |

Also record:
- runtime
- temporary video size
- crop count
- skipped SponsorBlock ranges
- model cost estimate, if applicable
- failure modes

## Visual vs No-Visual Comparison Questions

For each video, answer:

1. What did transcript-only miss?
2. What did local crops add for a human reviewer?
3. What did cheap vision add beyond raw crops?
4. Were the model-generated visual insights accurate enough to embed?
5. Which crops were redundant/noisy?
6. Would this video be worth a deep model pass?

## Embedding Candidate Schema

If cheap vision is useful, store one record per crop/visual segment:

```json
{
  "video_id": "...",
  "timestamp_seconds": 123.4,
  "youtube_url_at_timestamp": "https://youtu.be/...?...",
  "crop_path": "crops/001.jpg",
  "transcript_snippet": "...",
  "visual_description": "...",
  "principles": ["..."],
  "evidence": "...",
  "source": "local|cheap-vision|deep-vision",
  "confidence": 0.82,
  "sponsorblock_overlap": false
}
```

Embed `transcript_snippet + visual_description + principles + evidence`, with image path retained for review.

## Success Criteria

Proceed toward model routing if:

- Mode 1 captures important visuals in most visual/design videos.
- Mode 2 consistently adds accurate, generalizable visual insights beyond transcript-only.
- Cheap model output is good enough for embedding with low hallucination risk.
- Runtime and cost are compatible with async/scheduled batch processing.

Do **not** proceed to model routing yet if:

- local crop selection is still too noisy,
- cheap models mostly restate the transcript,
- visual claims are frequently ungrounded,
- or resolution/crop quality blocks useful interpretation.

## Immediate Next Steps

1. Finish cleanup todo for `youtube-visual-insights` prototype.
2. Run local extraction on the 7-video batch and create contact sheets.
3. Produce `comparison.md` for each video with transcript-only vs local-visual notes.
4. Select 2–3 representative videos for cheap vision-model testing.
5. Update `TODO-20447660` and `TODO-183adfa3` with this benchmark protocol.
