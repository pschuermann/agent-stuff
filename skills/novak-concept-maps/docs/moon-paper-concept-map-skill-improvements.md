# Moon Paper Review: Improvements For The Novak Concept Maps Skill

Reviewed papers:

- Brian M. Moon, Anthony J. Pino, and Christyne A. Hedberg, "Studying Transformation: The use of CmapTools in surveying the integration of Intelligence and Operations" (2006).
- Brian M. Moon, Karol G. Ross, and Jennifer K. Phillips, "Concept Map-based Assessment for Adult Learners" (2010).

## Main Takeaway

The current skill is good at producing Novak-style maps and learning exercises. Moon's papers suggest a more ambitious use: concept maps as an ongoing human-agent workspace for assessment, sensemaking, and change over time.

The skill should not only generate a map. It should help Codex and the human:

- build maps from the learner's own statements,
- compare the learner's map to an expert or target map,
- identify assessment areas from the differences,
- create map-based practice items from those differences,
- preserve the audit trail from source statement to proposition,
- revisit the map after learning and show what changed.

## Improvements To Add

### 1. Add A "Map-Based Assessment Mode"

Moon et al. (2010) use a four-stage process:

1. Elicit maps from experienced, intermediate, and novice performers.
2. Compare composite maps to identify knowledge differences.
3. Turn those differences into concept-map-based assessment items.
4. Use the items before and after training to detect changes.

For Codex, this becomes:

1. Ask the human for an initial map or elicit one through questions.
2. Build or use a target/expert map.
3. Compare the human map against the target map.
4. Generate practice items from the gaps, not from arbitrary propositions.
5. Re-map after study and show changes.

Skill instruction to add:

> When assessing a learner, do not generate exercises randomly from the finished map. First identify differences between the learner's current map and a target map: missing concepts, missing propositions, vague linking phrases, wrong relations, weak cross-links, and shallow detail within themes. Generate exercises from those differences.

### 2. Add Multiple Choice Concept Maps (MCCM)

Moon et al. (2010) introduce Multiple Choice Concept Maps, where any element of the map can become a choice: a concept, linking phrase, proposition, or larger map-level relation. The point is that the learner answers inside the context of the whole map, not as a disconnected quiz item.

The current skill already has "choose the concept" and "choose the link." It should generalize these into MCCM items:

- concept-choice MCCM: choose the best concept for a blank node;
- link-choice MCCM: choose the best linking phrase;
- proposition-choice MCCM: choose which proposition belongs in the map;
- map-level MCCM: choose which branch or cross-link best completes the whole map.

Important guardrail from the paper: the map-item format can confuse people. Some participants asked, in effect, "Where is the question?" The skill should always include a clear task header and interaction instructions before the map.

Skill instruction to add:

> For MCCM exercises, include a one-sentence task prompt above the map, visually mark the numbered blanks or selectable elements, and explain exactly how the learner should answer. Do not assume the map itself makes the task obvious.

### 3. Add Select-And-Fill-In (SAFI) Support

Moon et al. (2010) point to Select-And-Fill-In concept maps as appropriate for adult learners. SAFI is stricter than open fill-in but richer than ordinary multiple choice: the learner chooses from a set and fills blanks in the map.

Codex should support:

- a word bank of concepts,
- a word bank of linking phrases,
- mixed word banks for advanced learners,
- distractors that reflect common misconceptions,
- answer keys that explain why each distractor is wrong.

This fits your stated use case: "where I have to fill out the linking phrase or pick between concepts or pick the link."

### 4. Add Pre/Post Map Comparison

Moon et al. (2010) measured whether concept-map items detected knowledge change. For a human using Codex, the useful equivalent is a lightweight pre/post learning loop:

1. "Before": build a small map from memory.
2. Study or discuss.
3. "After": rebuild the map or answer MCCM/SAFI items.
4. Codex reports what changed.

Comparison should include:

- proposition count,
- correct propositions,
- missing expert propositions,
- newly added concepts,
- improved linking phrases,
- wrong or unsupported propositions,
- depth/detail inside each theme,
- new cross-links.

This should be framed carefully: proposition count is not understanding by itself. Moon uses counts as one signal, then looks at qualitative differences in the nature of propositions.

### 5. Add Theme-Based Composite Maps

Moon et al. (2010) organize composite maps by themes such as BLUFOR, Insurgents, Terrain, and Local Population. This is useful when maps become too large.

For Codex, a generated or elicited map should optionally include `themes`:

```json
{
  "themes": [
    {"id": "terrain", "label": "Terrain", "color": "#f4d35e"},
    {"id": "local_population", "label": "Local Population", "color": "#7fc97f"}
  ]
}
```

Each concept or proposition can refer to a theme. The HTML artifact can color-code by theme. The side panel can filter by theme.

Skill instruction to add:

> For large maps, organize propositions into 3-7 themes. Use themes to compare maps, generate focused exercises, and prevent the user from drowning in the whole map at once.

### 6. Add "Frames" Before Interpreting Big Maps

Moon et al. (2006) lean on Klein's Data/Frame model of sensemaking. Their key warning is that a giant merged map does not interpret itself. Analysts needed frames or tentative hypotheses from the forward team to guide sensemaking.

For Codex, before interpreting a large map, ask:

- What are we trying to explain?
- What decision or learning outcome should this map support?
- What frame are we currently using?
- What alternative frames should we test?
- Which propositions support or challenge the current frame?

Skill instruction to add:

> When a map has many propositions, do not summarize it as if the structure speaks for itself. First make the current frame explicit. Then inspect propositions that support, contradict, or complicate that frame.

### 7. Preserve The Audit Trail

Moon et al. (2006) emphasize the value of an audit trail from data to conclusions. They transformed interview notes into propositionally coherent maps, merged maps, selected subsets, and linked those subsets to analytic products.

Codex should preserve:

- source excerpt,
- normalized proposition,
- who asserted it,
- confidence,
- date/session,
- whether Codex reworded it,
- whether the human accepted/rejected it.

This matters for collaboration. If Codex rewrites the user's statement into a cleaner proposition, it should keep both versions.

Suggested schema addition:

```json
{
  "id": "P12",
  "from": "Prior Knowledge",
  "link": "shapes",
  "to": "New Learning",
  "source": {
    "kind": "conversation",
    "speaker": "user",
    "excerpt": "I think what I already know changes what I can learn next",
    "normalized_by": "codex",
    "accepted": true
  }
}
```

### 8. Add Map Merge And Synonym Handling

Moon et al. (2006) describe merging multiple maps and the messiness of acronyms, shorthand, and synonymous concepts. They also warn that links should not be casually merged because each link preserves propositional meaning.

Skill instruction to add:

> When merging maps, merge concepts cautiously through a synonym table, but do not merge linking phrases automatically. Keep separate propositions unless the human confirms they mean the same thing.

Useful agent behavior:

- propose a synonym table,
- ask the human to confirm merges,
- preserve rejected merges,
- detect acronyms and aliases,
- show "same concept, different proposition" clusters.

### 9. Add "Megamap Triage"

Moon et al. (2006) found that even well-made large maps are hard to digest. CmapTools' List View helped by showing concepts, links, and propositions in sortable lists; submaps made inspection manageable.

For Codex:

- always provide a proposition list for large maps,
- let the human filter by theme, concept, source, or frame,
- generate submaps from selected propositions,
- keep a map-of-maps,
- summarize one submap at a time,
- avoid pretending a 500-proposition map can be understood as one picture.

### 10. Add Human Collaboration Moves

The biggest skill improvement is conversational:

- Codex should ask the human to explain one branch in their own words.
- Codex should turn the explanation into propositions.
- Codex should ask, "Is this what you meant?"
- Codex should highlight weak links and ask for better linking phrases.
- Codex should occasionally ask the learner to rebuild a small submap from memory.
- Codex should compare the rebuilt version to the prior version.
- Codex should use wrong answers to update the learner model, not just mark them wrong.

This would make concept maps feel like a shared workspace instead of a diagram Codex hands over.

## Proposed Skill Modes After Moon

The skill currently has learning mode, knowledge elicitation mode, and artifact mode. Add these:

- `assessment mode`: compare current map to target map and generate MCCM/SAFI items.
- `pre-post mode`: build a before map, run learning activities, build an after map, report changes.
- `sensemaking mode`: merge propositions from sources, preserve audit trail, inspect through frames.
- `megamap mode`: organize large maps into themes, submaps, list views, and map-of-maps.

## Priority Changes

1. Add assessment mode with MCCM and SAFI exercises.
2. Add learner-map vs target-map comparison before exercise generation.
3. Add source/audit metadata to propositions.
4. Add themes and filtering for large maps.
5. Add frame prompts for sensemaking over large or merged maps.

These are more important than further visual polish. The renderer matters, but Moon's papers point to interaction design: how Codex and the human build, compare, revise, and learn from maps over time.
