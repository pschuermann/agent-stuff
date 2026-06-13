# Plan B: Visual Learning → Image Critique Skill Evaluation

## Purpose

Test whether YouTube visual/transcript extraction can produce reusable critique skills that generalize to new images.

The target outcome is **not** to imitate one creator verbatim or hardcode a video. The target is to extract durable principles, examples, and diagnostic questions from multiple videos, then evaluate whether a skill using those principles gives better image critique than a generic vision prompt.

## Core Questions

1. Can transcript + cropped visuals produce better design principles than transcript-only extraction?
2. Can those principles be turned into an agent skill that critiques images usefully?
3. Does the skill generalize to held-out images from other videos or sources?
4. How do cheap vision models compare with local-only extraction and stronger models?
5. What is the minimum-cost pipeline that produces useful critique?

## High-Level Protocol

```text
videos → extract transcript + crops → derive principles → create/update skill
       → test skill on held-out images → compare against baselines → revise
```

## Dataset Split

Use at least three buckets.

### 1. Training videos
Videos used to derive principles and examples.

Example source:
- Noah Daniel interiors/color/material videos
- Other creators or domains later, to reduce single-creator bias

### 2. Validation images
Images used while tuning the skill. These can include extracted stills from training videos, but should include both good and bad examples.

### 3. Held-out test images
Images never shown during skill creation. These should include:
- stills from different videos
- unrelated interior/design images
- intentionally bad examples
- ambiguous examples where critique should be careful

The held-out set is the key anti-overfitting control.

## Experiment Conditions

For each image, compare outputs from:

1. **Generic vision critique**
   - No custom skill, just ask for design critique.

2. **Transcript-only derived skill**
   - Skill created from video transcripts only.

3. **Transcript + visual examples skill**
   - Skill created from transcripts plus extracted crops.

4. **Transcript + visual examples + cheap vision labels**
   - Crops are captioned/labeled by a cheap vision model before principles are derived.

5. **Optional deep model reference**
   - More expensive model used only to create a comparison baseline, not default workflow.

## Skill Creation Rules

The skill should contain:

- reusable principles
- diagnostic questions
- common failure modes
- evidence patterns from examples
- critique structure
- language for uncertainty
- actionable improvement suggestions

The skill should avoid:

- references to specific video timestamps as rules
- creator-specific catchphrases as authority
- memorized descriptions of training images
- overclaiming intent or style
- pretending one aesthetic preference is universal

## Suggested Skill Output Format

For each image critique:

```markdown
## Overall read
Short summary of what works/doesn't work.

## Evidence from the image
Concrete visual observations.

## Principle-level critique
Tie observations to reusable design/color/material/composition principles.

## Most likely issue
The highest-impact problem, if any.

## Improvements
Specific changes, ranked by leverage.

## Confidence and caveats
What is uncertain or subjective.
```

## Evaluation Rubric

Score each output 1–5 on:

| Criterion | Question |
|---|---|
| Visual grounding | Does it cite real visible evidence, not generic advice? |
| Principle quality | Are principles accurate and reusable? |
| Specificity | Does it say something image-specific? |
| Actionability | Are improvements concrete and useful? |
| Nuance | Does it avoid overconfident or taste-policing claims? |
| Generalization | Does it work on held-out images? |
| Noah-alignment, optional | Would the critique resemble the kind of issue Noah discusses, without copying him? |

Also track failure modes:

- hallucinated objects/materials
- generic design platitudes
- overfitting to one creator/video
- missing the obvious issue
- too much transcript jargon without visual grounding
- too expensive/slow for routine use

## Evaluation Methods

### Human review
Primary method initially. Create side-by-side outputs for the same image under each condition and rate with the rubric.

### Lightweight LLM judge
Optional. Use a cheaper text model to compare outputs against the rubric, but do not trust it alone.

### Reference-note comparison
For extracted bad examples where the video discusses the image, keep the nearby transcript as a reference note. The skill output does not need to match exactly, but should identify similar underlying issues.

## Data Artifacts

Recommended experiment directory:

```text
experiments/visual-skill-eval/<run-id>/
├── source-videos.json
├── extracted/
│   ├── video-id/report.md
│   ├── video-id/manifest.json
│   └── video-id/crops/
├── principles/
│   ├── transcript-only.md
│   └── transcript-plus-visuals.md
├── skill-drafts/
│   └── interior-critique/SKILL.md
├── test-images/
├── outputs/
│   ├── generic/
│   ├── skill-transcript-only/
│   └── skill-visual/
└── evaluation.md
```

## First Minimal Experiment

Use 3–5 videos, including the current Noah fixtures.

1. Extract crops and transcripts with `youtube-visual-insights`.
2. Manually choose 10–20 good training examples and 10–20 held-out test images.
3. Draft one small critique skill from transcript + visuals.
4. Run generic critique and skill-assisted critique on the same held-out images.
5. Score side-by-side outputs with the rubric.
6. Decide whether visual extraction materially improves the skill.

## Success Criteria

Continue investing if:

- skill-assisted critique beats generic critique on held-out images
- transcript + visual skill beats transcript-only skill
- outputs are grounded in visible evidence
- failure modes are fixable with better examples/rubric, not only expensive models
- cheap/local workflow is good enough for most videos

Pause or redesign if:

- outputs are generic despite examples
- skill overfits to Noah-specific phrasing or preferences
- visual crops do not add useful principles
- cheap vision labels are noisy enough to degrade the skill
- human review cannot reliably tell which condition is better

## Open Questions

- How many videos are needed before principles stop overfitting to one creator?
- Do we need separate skills by domain, e.g. interiors, color, materials, UI, photography?
- Should skill creation be manual-reviewed every time, or can it be scheduled async with human approval?
- Which cheap vision models are good enough for crop captioning and image critique?
- Should held-out test images come from the same creator first, then cross-creator later?
