# Vision-Model Routing Design: youtube-visual-insights

> Design doc for cheap/async optional vision-model enrichment of extracted YouTube crops.
> This is a design-only document; no model calls are implemented yet.
> Last updated: 2026-06-13 (TODO-183adfa3)

## Purpose

The `youtube-visual-insights` extractor produces local/free cropped frames aligned with transcript snippets. This doc designs an **optional, selective, crop-level** vision-model routing layer that runs *after* local extraction is complete and stable.

Design goals:
1. **Default stays local/free** — no API keys, no model calls, no cost.
2. **Model calls are per-crop, never full-video by default** — one crop + transcript at a time.
3. **Prefer cheap vision-capable models** on OpenRouter; expensive/deep models only for uncertain high-signal crops or high-value videos.
4. **Budget-guarded and cancel-safe** — caps on crops, dollars, tokens; dry-run estimates.
5. **Async/scheduled compatible** — designed for overnight batch pipelines.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  youtube-visual-insights extractor (local/free)                     │
│  └─→ report.md, manifest.json, crops/                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               v
┌─────────────────────────────────────────────────────────────────────┐
│  Stage A: Crop Ranking & Routing (local, no model calls)            │
│  ├─ Load manifest.json + crops/                                     │
│  ├─ Score each crop for “vision worthiness”                        │
│  ├─ Cluster/dedupe; pick N targets                                 │
│  └─→ ranked_crop_queue.json                                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              v                                 v
┌─────────────────────────────┐   ┌─────────────────────────────────┐
│  Stage B: Cheap Vision Pass │   │ Stage C: Deep Review (optional) │
│  (openrouter, ~$0.001–0.005 │   │ (openrouter, ~$0.01–0.10 per   │
│   per crop)                 │   │  crop, or local strong model)   │
│  └─→ crop-insights.jsonl    │   │  └─→ deep-insights.jsonl        │
└─────────────────────────────┘   └─────────────────────────────────┘
                               │
                               v
┌─────────────────────────────────────────────────────────────────────┐
│  Stage D: Merge & Embed                                             │
│  ├─ Combine local + cheap + deep into enriched manifest             │
│  ├─ Produce visual-summary.md                                       │
│  └─→ embedding-ready records for search/RAG/skill-creation         │
└─────────────────────────────────────────────────────────────────────┘
```

The routing layer is a **separate post-processing script**, not a modification to `extract_visual_insights.py`. This keeps the extractor stable, local, and fast.

## Modes: `--vision off | cheap | deep | auto`

| Mode | Behavior |
|---|---|
| `off` | Skip all vision-model stages. Emit only local extractor output (default). |
| `cheap` | Run Stage B only. Rank crops locally, send top N to cheap vision model. No deep model. |
| `deep` | Skip cheap; send top-ranked crops directly to a deep model. Use sparingly for high-value videos where cheap model quality is known to be insufficient. |
| `auto` | Run Stage A ranking, then Stage B on all eligible crops, then Stage C only on crops where cheap model signals `needs_deep_review: true` or where local+cheap confidence is below threshold. |

Mode can be set via:
- CLI flag on the routing script (recommended): `--vision {off|cheap|deep|auto}`
- Environment variable: `YTVI_VISION_MODE=auto`
- Per-video config in a batch list: `video_id,mode,max_crops,max_spend`

### Recommended: separate post-processing script

```bash
# After local extraction completes
python3 skills/youtube-visual-insights/scripts/enrich_visual_insights.py \
  --manifest /tmp/ytvi-run/manifest.json \
  --vision cheap \
  --max-crops-per-video 8 \
  --dry-run

# Async batch
python3 skills/youtube-visual-insights/scripts/enrich_visual_insights.py \
  --batch-file videos.csv \
  --vision auto \
  --max-dollars-per-video 0.05 \
  --output-root /tmp/ytvi-enriched/
```

This separation means:
- The extractor stays untouched and fast.
- Routing can be run, re-run, or skipped independently.
- Different model providers or prompts can be swapped without touching extraction.

## Stage A: Crop Ranking & Routing (Local)

### Inputs
- `manifest.json` from extractor
- `crops/` directory

### Per-crop routing score

Each crop gets a composite routing score (0–100) from local signals already present in the manifest:

| Signal | Weight | Source |
|---|---|---|
| Local crop score | 25% | `crop.score` from extractor |
| Transcript density (words/sec in window) | 20% | computed from `transcript_segments` |
| Cluster uniqueness (dedup value) | 15% | inverse of cluster size; singletons score highest |
| Timestamp distribution bonus | 15% | crops far from others in timeline get a small boost |
| SponsorBlock clean | 10% | must be `sponsorblock_overlap: false` (gates inclusion, not score) |
| Transcript confidence proxy | 15% | presence of concrete nouns/materials/colors/numbers in transcript text |

Computations are local and fast. No model calls.

### Filtering gates (hard exclusion)

A crop is excluded from vision routing if any of:
- `sponsorblock_overlap: true`
- `score < MIN_CROP_SCORE` (same 18.0 threshold as extractor)
- No transcript text and mode requires grounding (`cheap`, `auto`)
- Hash/cluster duplicate within `DEDUP_HASH_DISTANCE` (already done by extractor; routing respects it)

### Output: `ranked_crop_queue.json`

```json
{
  "video_id": "y0PnZi9Mzv0",
  "routing_version": "2026-06-13",
  "mode": "cheap",
  "max_crops_budgeted": 8,
  "crops": [
    {
      "timestamp_seconds": 54.0,
      "image_path": "crops/001_00m54s000ms_right_38.jpg",
      "routing_score": 78.5,
      "signals": {
        "local_score": 31.2,
        "transcript_word_count": 42,
        "cluster_size": 1,
        "timeline_bonus": 5.0,
        "transcript_confidence_proxy": 0.72
      },
      "transcript_snippet": "...",
      "queued_for": "cheap"
    }
  ]
}
```

## Stage B: Cheap Vision Pass

### Candidate models (first bake-off)

Benchmark these in order of preference. The goal is to find the cheapest model that produces accurate, grounded, generalizable visual insights.

#### Tier 1: Primary cheap candidates

| Model | Provider | Rough price (image+text) | Why try first |
|---|---|---|---|
| `google/gemini-3.1-flash-lite` | OpenRouter | ~$0.0005–0.001 / image | Very cheap, fast, good at OCR/layout; 3.x series is latest lightweight from Google |
| `google/gemini-2.5-flash-lite` | OpenRouter | ~$0.0003–0.0008 / image | Even cheaper if still available; good baseline for cost floor |

#### Tier 2: If Tier 1 is insufficient

| Model | Provider | Rough price | When to try |
|---|---|---|---|
| `moonshotai/kimi-k2.5` | OpenRouter | ~$0.001–0.003 / image | Strong long-context and visual reasoning; acceptable latency |
| `moonshotai/kimi-k2.6` | OpenRouter | ~$0.002–0.005 / image | If k2.5 is too weak on design/detail tasks |
| `google/gemini-2.5-flash` (non-lite) | OpenRouter | ~$0.001–0.003 / image | Slightly stronger than flash-lite; fallback if lite misses obvious details |

#### Tier 3: Deep fallback

| Model | Provider | Rough price | When to try |
|---|---|---|---|
| `anthropic/claude-sonnet-4` | OpenRouter | ~$0.005–0.02 / image | High accuracy, slow; use only for crops flagged `needs_deep_review` or user-requested deep pass |
| `google/gemini-2.5-pro` | OpenRouter | ~$0.005–0.015 / image | Strong visual reasoning; alternative deep option |

> **Prices are approximate** as of 2026-06-13. Always check OpenRouter pricing before batch runs. Actual costs depend on prompt token count and image resolution.

### Prompt design

Per-crop, send:
- The crop JPEG (resized to ≤ 1024px on longest side to reduce cost)
- Transcript snippet (± window seconds)
- System instruction

**System prompt:**

```
You are a visual learning assistant. Analyze the provided image crop from a YouTube video,
along with the nearby transcript. Produce structured output about what the image shows,
why it matters in context, and what generalizable design or learning principles it illustrates.

Rules:
- Ground every claim in visible evidence from the crop.
- Use the transcript only as context, not as a source of facts not visible in the image.
- Prefer generalizable principles over video-specific descriptions.
- If the crop is ambiguous, unclear, or mostly talking-head/background, say so and set confidence low.
- Respond ONLY in the requested JSON format.
```

**User prompt:**

```
Transcript near this moment (±5 seconds):
"{transcript_snippet}"

Analyze the attached image crop.
```

### Per-crop output schema

```json
{
  "visual_description": "Concise description of what is visible in the crop.",
  "design_relevance": "Why this visual matters in the video's context.",
  "generalizable_principles": [
    "A reusable principle or lesson, not tied to this specific video."
  ],
  "evidence": "Specific visible details that support the description and principles, grounded in the crop image.",
  "confidence": 0.85,
  "needs_deep_review": false,
  "model_used": "google/gemini-3.1-flash-lite",
  "cost_estimate_usd": 0.0007,
  "prompt_tokens": 420,
  "completion_tokens": 180,
  "timestamp_seconds": 54.0
}
```

**Field semantics:**

| Field | Required | Notes |
|---|---|---|
| `visual_description` | yes | Objective, not interpretive. |
| `design_relevance` | yes | Connects crop to the video's apparent topic. |
| `generalizable_principles` | yes | Array of 0–3 strings. Empty array is valid if nothing generalizable is visible. |
| `evidence` | yes | Concrete visual details. Must cite what is *seen*, not inferred from transcript alone. |
| `confidence` | yes | 0.0–1.0. Calibrate: 0.9+ = clearly interpretable; 0.5–0.7 = ambiguous; <0.5 = not useful. |
| `needs_deep_review` | yes | `true` if confidence < 0.6 *and* local score is high (crop looks important but model is uncertain), or if the crop appears central to a lesson but the cheap model can't interpret it. |
| `model_used` | yes | Full model identifier for traceability. |
| `cost_estimate_usd` | yes | Estimated cost for this call (from OpenRouter usage or pricing lookup). |
| `prompt_tokens` | no | For debugging cost regression. |
| `completion_tokens` | no | For debugging cost regression. |
| `timestamp_seconds` | yes | Echo from input for alignment. |

### Output: `crop-insights.jsonl`

One JSON object per line, one per crop processed.

```json
{"timestamp_seconds":54.0,"video_id":"y0PnZi9Mzv0",...}
{"timestamp_seconds":91.0,"video_id":"y0PnZi9Mzv0",...}
```

## Stage C: Routed Deep Review

Triggered only when:
- Mode is `deep` (all top crops go to deep model)
- Mode is `auto` and Stage B returned `needs_deep_review: true`
- User explicitly marked video as high-value in batch config
- Local score is very high (top 10% for video) but cheap confidence is very low (< 0.5)

Deep model uses the **same prompt schema** but replaces the cheap model. The output is written to `deep-insights.jsonl` with `source: "deep-vision"`.

**Deep mode budget gate:**
- Max 3 deep crops per video in `auto` mode.
- Hard cap: never spend more than 3× the cheap budget on deep calls.

## Stage D: Merge & Embed

### Enriched manifest

Merge local `manifest.json` + `crop-insights.jsonl` (+ optional `deep-insights.jsonl`) into:

```text
<output>/
├── report.md                    # local extractor output (untouched)
├── manifest.json                # local extractor output (untouched)
├── crops/                       # local extractor output (untouched)
├── enriched/                    # NEW: routing output
│   ├── ranked_crop_queue.json
│   ├── crop-insights.jsonl
│   ├── deep-insights.jsonl      # optional
│   ├── enriched-manifest.json   # merged
│   └── visual-summary.md        # human-readable summary of model insights
```

### `enriched-manifest.json` schema

Top-level same as `manifest.json` plus:

```json
{
  "enrichment": {
    "mode": "auto",
    "cheap_model": "google/gemini-3.1-flash-lite",
    "deep_model": "anthropic/claude-sonnet-4",
    "total_crops_processed": 8,
    "total_cost_usd": 0.012,
    "deep_crops_processed": 2,
    "deep_cost_usd": 0.028
  },
  "crops": [
    {
      "timestamp_seconds": 54.0,
      "local": { /* original crop fields */ },
      "cheap_vision": { /* crop-insights.jsonl entry or null */ },
      "deep_vision": { /* deep-insights.jsonl entry or null */ }
    }
  ]
}
```

Each crop entry preserves the original local data and adds nested `cheap_vision` / `deep_vision` objects. This makes it easy to compare cheap vs deep side-by-side during bake-off evaluation.

### `visual-summary.md`

Human-readable summary derived from model outputs:

```markdown
# Visual Insights: how to use color in interior design

## High-confidence principles (cheap vision)

1. **Color wheel usage:** At 00:54, the crop shows a split-complementary scheme...
   - Evidence: visible color wheel with annotations
   - Confidence: 0.92

## Uncertain crops flagged for review

- 02:56: ambiguous layout crop (confidence 0.48, needs_deep_review=true)
  - Deep review result: [if available]

## Cost summary
- Cheap passes: 8 crops, ~$0.012
- Deep passes: 2 crops, ~$0.028
- Total: ~$0.040
```

## Budget Guardrails

### Per-video caps

| Cap | Default | Override |
|---|---|---|
| Max crops sent to cheap model | 8 | `--max-crops-per-video N` |
| Max cheap spend per video | $0.05 | `--max-cheap-dollars D` |
| Max deep crops per video | 3 (auto), unlimited (deep mode) | `--max-deep-crops N` |
| Max deep spend per video | $0.20 | `--max-deep-dollars D` |
| Max total tokens per cheap call | 8k | `--max-tokens-cheap N` |
| Max total tokens per deep call | 16k | `--max-tokens-deep N` |

### Global caps (batch mode)

| Cap | Default | Override |
|---|---|---|
| Max videos per batch | unlimited | `--max-videos N` |
| Max total spend per batch | $5.00 | `--max-batch-dollars D` |
| Dry-run | off | `--dry-run` |

### Dry-run behavior

With `--dry-run`:
1. Stage A runs fully (local ranking).
2. Stage B is simulated: print which crops would be sent to which model, with estimated cost.
3. No API calls are made.
4. Output: `dry-run-plan.json` with per-crop estimates.

### Cancel-safe batching

- Write `batch-state.json` after every video completes.
- On resume, skip videos already in state.
- On interrupt, partial outputs are valid and resumable.
- API errors on one crop log and continue; they do not crash the batch.

## Routing Thresholds

### From local crop score

| Local score | Action |
|---|---|
| ≥ 40 | High priority for cheap vision; if cheap confidence < 0.6, eligible for deep |
| 25–40 | Standard queue for cheap vision |
| 18–25 | Include only if transcript density or uniqueness is high |
| < 18 | Excluded by extractor; never reaches routing |

### From duplicate cluster

| Cluster size | Action |
|---|---|
| 1 (unique) | Standard inclusion |
| 2–3 | Include best-scoring representative only |
| > 3 | Include best only; note potential over-sampling in `visual-summary.md` |

### From transcript density

Transcript word count in window vs average for video:

| Density ratio | Action |
|---|---|
| > 1.5× mean | Boost routing score; crop likely captures an active explanation moment |
| 0.5–1.5× mean | Standard |
| < 0.5× mean | Penalty; crop may be a silent demonstration or B-roll |

### From video value

Video-level signals that boost all crop routing scores:

| Signal | Boost |
|---|---|
| Video is explicitly tagged high-value in batch config | +10 routing score |
| Video duration 10–30 min (visual essay sweet spot) | +5 |
| Video has >80% transcript association ratio from extractor | +5 |
| Video is in a known high-yield category (design, tutorial, review) | +3 |
| Video is < 3 min or > 2h | −5 (likely too short for meaningful crops, or too long for dense value) |

### From crop uncertainty

After cheap model runs (auto mode only):

| Cheap confidence | Cheap `needs_deep_review` | Action |
|---|---|---|
| ≥ 0.85 | false | Keep cheap output; no deep |
| 0.60–0.85 | false | Keep cheap; flag "moderate confidence" in summary |
| 0.40–0.60 | true | Eligible for deep if deep budget remains |
| < 0.40 | any | Discard unless deep model resolves with confidence ≥ 0.70; otherwise drop from enriched output |

## Async Overnight / Scheduled Workflow

### Headless batch script

```bash
#!/usr/bin/env bash
# run-ytvi-enrichment-batch.sh

SOURCE_DIR="/Volumes/data/ytvi-extracted"
OUTPUT_ROOT="/Volumes/data/ytvi-enriched"
BATCH_LIST="/Volumes/data/batch-2026-06-13.csv"

python3 skills/youtube-visual-insights/scripts/enrich_visual_insights.py \
  --batch-file "$BATCH_LIST" \
  --source-root "$SOURCE_DIR" \
  --output-root "$OUTPUT_ROOT" \
  --vision auto \
  --max-crops-per-video 8 \
  --max-cheap-dollars 0.05 \
  --max-deep-dollars 0.20 \
  --max-batch-dollars 5.00 \
  --resume \
  --log-level INFO \
  2>&1 | tee "$OUTPUT_ROOT/batch-$(date +%Y%m%d-%H%M).log"
```

### Batch CSV format

```csv
video_id,vision_mode,max_crops,max_cheap_dollars,max_deep_dollars,high_value
y0PnZi9Mzv0,auto,8,0.05,0.20,false
8QQoy4X-VnQ,cheap,6,0.03,0.00,false
BBkwTKPwJUI,deep,12,0.00,0.50,true
```

Blank cells use global defaults.

### Scheduling options

1. **cron** on a server or always-on Mac:
   ```cron
   0 2 * * * /path/to/run-ytvi-enrichment-batch.sh
   ```

2. **launchd** on macOS for queue-based processing.

3. **GitHub Actions** for repository-triggered batches (free tier compute, secrets for `OPENROUTER_API_KEY`).

4. **pi agent loop** — a Pi session can be instructed to run the batch, review `visual-summary.md`, and update a todo.

### Resume and idempotency

- `batch-state.json` tracks: `video_id`, `status` (`queued|ranking|cheap|deep|merged|done|error`), `cost_so_far`, `crops_processed`.
- Re-running with `--resume` skips `done` entries.
- `--force` re-runs a specific video.
- Output directories use `video_id` as key; existing `enriched/` content is preserved unless `--overwrite`.

## Embedding Schema

One record per crop that has been through any enrichment stage. Records are append-only to a JSONL file suitable for embedding pipelines (e.g. `text-embedding-3-small`, ` voyage-3`, or local models).

### Record schema

```json
{
  "record_id": "ytvi:y0PnZi9Mzv0:54.0:cheap",
  "video_id": "y0PnZi9Mzv0",
  "video_title": "how to use color in interior design",
  "youtube_url_at_timestamp": "https://youtu.be/y0PnZi9Mzv0?t=54",
  "timestamp_seconds": 54.0,
  "timestamp_formatted": "00:00:54",
  "crop_path": "crops/001_00m54s000ms_right_38.jpg",
  "transcript_snippet": "so here's the color wheel and...",
  "visual_description": "A color wheel annotated with split-complementary arrows...",
  "design_relevance": "Demonstrates how to select harmonious colors...",
  "principles": ["Use split-complementary schemes for vibrant but balanced palettes"],
  "evidence": "Visible color wheel with red, yellow-green, and blue-green highlighted; arrows drawn between them",
  "source": "cheap-vision",
  "confidence": 0.92,
  "model_used": "google/gemini-3.1-flash-lite",
  "cost_usd": 0.0007,
  "sponsorblock_overlap": false,
  "created_at": "2026-06-13T02:15:00Z"
}
```

### Text for embedding

The embedding text combines transcript and visual insight:

```
Video: how to use color in interior design
Timestamp: 00:00:54
Transcript: so here's the color wheel and...
Visual: A color wheel annotated with split-complementary arrows...
Principles: Use split-complementary schemes for vibrant but balanced palettes
Evidence: Visible color wheel with red, yellow-green, and blue-green highlighted
```

This is stored in `embedding_text` field. The image path is retained for RAG retrieval that supports multimodal embeddings later.

### Storage

- Per-video: `enriched/embedding-records.jsonl`
- Aggregate (batch): `embedding-records-all.jsonl` symlinked or appended by batch runner
- Deduplication key: `record_id` = `ytvi:{video_id}:{timestamp}:{source}`

## Evaluation: How to Compare Against Plan A / Plan B

### Plan A benchmark integration

The existing Plan A harness (`compare_transcript_vs_visual.py`) produces:
- `transcript-only.md` (Mode 0)
- `visual-local/report.md` (Mode 1)
- `comparison.md`

Vision routing adds:
- Mode 2: cheap vision (`enriched/crop-insights.jsonl`)
- Mode 3: routed deep (`enriched/deep-insights.jsonl`)

Updated bundle layout:

```text
benchmark/<video_id>/
├── metadata.json
├── transcript-only.md
├── visual-local/
│   ├── report.md
│   ├── manifest.json
│   ├── crops/
│   └── contact.jpg
├── enriched/                    # NEW
│   ├── crop-insights.jsonl
│   ├── deep-insights.jsonl      # optional
│   ├── enriched-manifest.json
│   ├── visual-summary.md
│   └── embedding-records.jsonl
└── comparison.md                # updated to reference enriched/
```

### Evaluation workflow

For each video in the benchmark set:

1. **Run local extractor** → `visual-local/`
2. **Run comparison harness** → `transcript-only.md`, `comparison.md`
3. **Run vision routing** (cheap or auto) → `enriched/`
4. **Human review** of `visual-summary.md` against `transcript-only.md`:
   - Did cheap vision add information not in transcript?
   - Are visual claims grounded in the crop?
   - Are principles generalizable?
5. **Score with rubric** (1–5 each):
   - Visual recall
   - Crop focus
   - Transcript alignment
   - Added insight over transcript-only
   - Added insight over local-only
   - Generalizable principles
   - Hallucination control
   - Cost/runtime fit for batch
   - Embedding value

6. **Model bake-off**: for 2–3 representative videos, run all Tier 1/2 candidates on the same crop set. Compare:
   - Output quality (human-rated)
   - Cost per crop
   - Latency per crop
   - Agreement rate (do models agree on `needs_deep_review`?)

### Success criteria for activating routing

| Criterion | Threshold |
|---|---|
| Cheap model adds insight beyond local for ≥ 60% of evaluated crops | Proceed |
| Hallucination rate (ungrounded claims) < 10% | Proceed |
| Average cost per video < $0.10 in cheap mode | Proceed |
| Deep model resolves ≥ 50% of `needs_deep_review` flags with confidence ≥ 0.70 | Deep routing is useful |
| Embedding records are useful for search/RAG in manual test | Proceed to integration |

### Failure criteria (pause or redesign)

| Criterion | Action |
|---|---|
| Cheap model restates transcript without visual insight | Pause; improve prompt or drop model |
| Hallucination rate > 25% | Pause; add stricter grounding rules or switch model |
| Cost per video > $0.30 in cheap mode | Redesign: fewer crops, smaller images, cheaper model |
| Deep model does not improve cheap outputs meaningfully | Drop deep mode; stick to cheap only |
| Local crop quality blocks useful interpretation | Pause routing; fix extractor first |

## Implementation Checklist (future work)

- [ ] Implement Stage A: `rank_crops()` in routing script
- [ ] Implement Stage B: OpenRouter client with retry/backoff
- [ ] Implement prompt builder and JSON schema validator
- [ ] Implement Stage C: deep model router with budget gate
- [ ] Implement Stage D: merge into `enriched-manifest.json` + `visual-summary.md`
- [ ] Implement embedding record generator
- [ ] Implement batch runner with `--resume` and `--dry-run`
- [ ] Add `--vision` CLI flag to routing script
- [ ] Write unit tests for routing score computation
- [ ] Run model bake-off on 2–3 videos
- [ ] Update Plan A harness to reference enriched outputs
- [ ] Document failure modes and retry logic

## Open Questions

1. Should the routing script support local vision models (e.g. Ollama + LLaVA) as a zero-cost alternative, even if weaker?
2. Should we cache OpenRouter responses keyed by crop hash to avoid re-processing identical crops across videos?
3. How should we handle videos where no crops are eligible for routing (all low-score or all SponsorBlock)?
4. Should the embedding schema include vector embedding itself, or only text + metadata?
5. What is the optimal image resize dimension for cost/quality tradeoff per model?
