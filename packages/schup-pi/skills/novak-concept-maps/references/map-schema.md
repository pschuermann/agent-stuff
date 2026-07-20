# Concept Map JSON Schema

Use this schema when generating artifacts with `scripts/cmap_artifact.py`. JSON is the proposition model and source of truth; the HTML, Markdown, Mermaid, and CXL files are views. Complete the focus-question, parking-lot, and proposition checkpoints in `artifact-workflow.md` before making JSON.

```json
{
  "title": "Meaningful Learning",
  "theme": "cmap-yellow",
  "focus_question": "How does meaningful learning happen?",
  "sources": [
    {
      "id": "novak-canas-2008",
      "citation": "Novak, J. D., and Cañas, A. J. (2008). The Theory Underlying Concept Maps.",
      "url": "https://cmap.ihmc.us/docs/theory-of-concept-maps"
    }
  ],
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
      "phrase_y": 120,
      "source_refs": ["novak-canas-2008"]
    }
  ],
  "parking_lot": ["Prior Knowledge", "Concepts"],
  "assessment": {
    "mode": "learner_vs_reference",
    "objective": "Diagnose whether the learner can explain meaningful learning as propositions.",
    "orientation": "Read each concept-link-concept line as a sentence before answering.",
    "reference_map": "expert-map.json",
    "learner_map": "learner-map.json",
    "comparison_summary": ["Learner omits prior knowledge."]
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

## Required Fields

- `title`: Short map title.
- `focus_question`: The question the map answers.
- `concepts`: Concept nodes. Every node has a unique, stable `id`, a concise `label`, and normally a `rank` (lower is more general/higher).
- `propositions`: Edges. Every edge has a unique `id`; `from`, `link`, and `to` form a readable proposition and `from`/`to` refer to concept IDs.

Structural errors such as a missing ID or an unknown concept reference prevent rendering. The renderer issues non-fatal advisory warnings for high-confidence review prompts such as duplicate labels, sentence-like labels, explicit navigation/caption links, or a source reference it cannot resolve. It intentionally does not try to infer whether a linking phrase contains a valid verb; read the proposition aloud instead.

## Optional Fields

- `theme`: `cmap-yellow`, `cmap-blue`, or omit for the default style.
- Concept `x`, `y`, `w`, `h`: hand-place a concept box.
- Proposition `type`: `hierarchy`, `cross-link`, `example`, or `diagnostic`.
- Proposition `arrow`: omit or use `true` for directional claims; set `false` only for a genuinely symmetric relation.
- Proposition `phrase_x`, `phrase_y`: hand-place the linking phrase.
- `parking_lot`: Candidate concepts considered before modeling. Do not put task framing or source metadata here merely because it appeared in the request.
- `assessment`, `resources`, `exercises`: Metadata rendered in the side panel and Markdown.

## Sources and Proposition Provenance

Use `sources` when claims come from a document, video, interview, dataset, or several sources. Each entry needs a unique `id`; use `citation`, `title`, and/or `url` to make it inspectable. A proposition can name zero or more registry IDs in `source_refs`.

```json
{
  "sources": [
    {"id": "interview-lee", "title": "Lee incident-response interview", "date": "2025-03-14"},
    {"id": "runbook-v3", "title": "Incident runbook", "url": "https://example.test/runbook/v3"}
  ],
  "propositions": [
    {
      "id": "P7",
      "from": "escalation",
      "link": "requires",
      "to": "evidence",
      "source_refs": ["interview-lee", "runbook-v3"]
    }
  ]
}
```

The HTML and Markdown proposition tables retain `source_refs` and render the source registry. Keep source context outside concept boxes. If a proposition is the mapmaker's synthesis rather than directly supported by one source, omit `source_refs` or identify it in a map note; do not invent provenance.

## Layout Guidance

For simple study maps, `rank` is usually enough and the renderer can place nodes automatically. For maps that should resemble Novak/Cañas or CmapTools examples, provide hand-tuned coordinates:

- Put rank 0 concepts near the top and broader concepts above narrower concepts.
- Put linking phrases in open space between the two concepts, never inside a concept box.
- Use arrows for sequence, causation, input/output, prerequisites, dependencies, part-whole, evidence, implication, and constraints.
- Use no arrow only for a symmetric relation or an intentionally undirected source style.
- Hand-place cross-link phrases and add cross-links only when they integrate separate regions.
- Use `?details=hidden` on generated HTML for a large canvas.

## Exercise Types

- `fill_link`: Learner supplies the linking phrase.
- `choose_concept`: Learner selects the missing concept.
- `choose_link`: Learner selects the best linking phrase.
- `repair_misconception`: Learner repairs a faulty proposition.
- `reconstruct_map`: Learner builds a map from a parking lot.
- `mccm`: Multiple Choice Concept Map.
- `safi`: Select-And-Fill-In.
- `compare_maps`: Learner compares a learner map and reference map by propositions.
- `pre_post_reflection`: Learner explains what changed between two maps.

For multiple-choice exercises add an `options` array. For assessment exercises, add `rationale`, `rubric`, and `source_propositions` when useful.

## Assessment Guidance

For learner/reference comparisons, compare shared propositions, missing concepts, extra/off-focus concepts, weak or incorrect linking phrases, missing cross-links, hierarchy, detail, nuance, and perspective-taking. For pre/post comparisons, retain the same focus question and compare proposition quality, not merely count.
