# Concept Map JSON Schema

Use this schema when generating artifacts with `scripts/cmap_artifact.py`. The preferred display artifact is the generated HTML file, because it can render concepts and linking phrases as separate spatial objects. Markdown/Mermaid is a fallback.

```json
{
  "title": "Meaningful Learning",
  "theme": "cmap-yellow",
  "focus_question": "How does meaningful learning happen?",
  "concepts": [
    {
      "id": "meaningful_learning",
      "label": "Meaningful Learning",
      "rank": 0,
      "x": 340,
      "y": 40,
      "w": 180,
      "h": 52
    }
  ],
  "propositions": [
    {
      "id": "P1",
      "from": "meaningful_learning",
      "link": "requires",
      "to": "prior_knowledge",
      "type": "hierarchy",
      "arrow": true,
      "phrase_x": 360,
      "phrase_y": 120
    }
  ],
  "parking_lot": [
    "Prior Knowledge",
    "Concepts"
  ],
  "assessment": {
    "mode": "learner_vs_reference",
    "objective": "Diagnose whether the learner can explain meaningful learning as propositions.",
    "orientation": "Read each concept-link-concept line as a sentence before answering.",
    "reference_map": "expert-map.json",
    "learner_map": "learner-map.json",
    "comparison_summary": [
      "Learner omits prior knowledge.",
      "Learner treats concept maps mainly as visual organizers."
    ]
  },
  "resources": [
    {
      "concept": "prior_knowledge",
      "title": "Example case",
      "path_or_url": "cases/example.md",
      "kind": "case"
    }
  ],
  "exercises": [
    {
      "type": "fill_link",
      "prompt": "Meaningful Learning -> ________ -> Prior Knowledge",
      "answer": "requires",
      "rationale": "The proposition should state a necessary condition, not a decorative feature.",
      "rubric": "Correct: expresses necessity. Partial: mentions relation to prior knowledge but vague. Incorrect: treats prior knowledge as optional."
    }
  ]
}
```

## Fields

- `title`: Short map title.
- `theme`: Optional HTML style. Use `cmap-yellow` for CmapTools-like yellow examples, `cmap-blue` for blue-outline Novak examples, or omit it for the default Codex artifact style.
- `focus_question`: The question the map answers.
- `concepts`: Concept nodes. Each `id` must be unique and stable. Each `label` should be concise. `rank` is general-to-specific, with lower numbers placed higher. Optional `x`, `y`, `w`, and `h` fields hand-place concept boxes in the HTML and CXL outputs.
- `propositions`: Edges. `from`, `link`, and `to` must form a readable proposition. `type` can be `hierarchy`, `cross-link`, `example`, or `diagnostic`. Optional `arrow` controls whether the rendered link has an arrowhead; omit it or set `true` when direction matters, and set `false` only for genuinely symmetric relations. Optional `phrase_x` and `phrase_y` fields hand-place the linking phrase in the HTML and CXL outputs.
- `parking_lot`: Optional list of concepts considered while building the map.
- `assessment`: Optional assessment metadata. Use this when the map is part of a learner/reference comparison, pre/post comparison, MCCM, SAFI, or other concept-map-based assessment workflow.
- `resources`: Optional resources attached to concepts, useful for CTA knowledge models. These may be cases, images, procedures, manuals, forms, videos, or URLs.
- `exercises`: Optional learning checks.

## Layout Guidance

For simple study maps, `rank` is usually enough and the renderer can place nodes automatically.

For maps that should resemble Novak/Cañas or CmapTools examples, provide hand-tuned coordinates:

- Put rank 0 concepts near the top.
- Put broader concepts above narrower concepts.
- Place linking phrases in open space between the two concepts, not on top of either concept.
- Use arrows when the relationship has a reading direction, such as sequence, cause, input/output, prerequisite, dependency, part-whole, evidence, implication, or constraint.
- Omit arrows only when the relationship is genuinely symmetric or when matching a source map that intentionally omits direction.
- Use cross-links sparingly and expect to hand-place their phrase boxes.
- Use `?details=hidden` on the generated HTML file when viewing a large map.

## Exercise Types

- `fill_link`: Learner supplies the linking phrase.
- `choose_concept`: Learner selects the missing concept.
- `choose_link`: Learner selects the best linking phrase.
- `repair_misconception`: Learner repairs a faulty proposition.
- `reconstruct_map`: Learner builds a map from a parking lot.
- `mccm`: Multiple Choice Concept Map. Learner chooses a missing concept, linking phrase, proposition, or map level from a map region.
- `safi`: Select-And-Fill-In. Learner chooses supplied concepts or links and fills in missing language.
- `compare_maps`: Learner compares a learner map and reference map by propositions.
- `pre_post_reflection`: Learner explains what changed between two maps.

For multiple choice exercises, add an `options` array:

```json
{
  "type": "choose_link",
  "prompt": "Focus Question -> ? -> Concept Map",
  "options": ["decorates", "sets context for", "is an example of"],
  "answer": "sets context for"
}
```

For assessment exercises, add `rationale`, `rubric`, and source references when useful:

```json
{
  "type": "mccm",
  "prompt": "Which linking phrase best completes this proposition: Prior Knowledge -> ________ -> Meaningful Learning?",
  "options": ["is required for", "is copied from", "is unrelated to"],
  "answer": "is required for",
  "rationale": "The item tests whether the learner sees prior knowledge as a condition for meaningful learning.",
  "rubric": "Correct: selects necessity. Partial: explains prior knowledge matters but chooses a vague link. Incorrect: treats prior knowledge as irrelevant.",
  "source_propositions": ["P3"]
}
```

## Assessment Guidance

For learner/reference comparisons, compare propositions first:

- Shared propositions.
- Missing concepts.
- Extra or off-focus concepts.
- Weak or incorrect linking phrases.
- Missing cross-links.
- Hierarchy differences.
- Differences in detail, nuance, and perspective-taking.

For pre/post comparisons, use the same focus question and compare changes in proposition quality, not just proposition count.
