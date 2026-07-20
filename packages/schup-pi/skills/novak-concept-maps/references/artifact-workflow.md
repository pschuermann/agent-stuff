# Proposition-First Artifact Workflow

Use this workflow for non-trivial maps, source-grounded maps, saved artifacts, and maps published through a visual surface. Its order prevents a familiar failure: turning a topic outline into an attractive but non-Novak diagram.

## 1. Verify Sources

Before extracting concepts, identify the exact source. For a document or video, confirm its title, author or speaker, date/version, and URL or local path where available. If search returns several similarly titled items, present the candidates and wait; do not map the most plausible one.

Use a map-level `sources` registry and proposition-level `source_refs` when a map is based on one or more sources. A source reference identifies evidence for a claim; it is not normally a concept node.

## 2. Confirm the Focus Question

State one question the map will answer. If the request gives only a topic, offer distinct questions and wait for a choice. The focus question determines whether a candidate is a concept, useful detail, or off-focus context.

## 3. Build and Audit the Parking Lot

List candidate domain concepts, then mark each as:

- **eligible concept** — a concise subject-matter regularity that can participate in a proposition;
- **metadata** — source, task, audience, artifact plan, or status information; or
- **note/example** — useful evidence that should not become a concept box yet.

Merge duplicate concepts and rank eligible concepts from general to specific. Keep source metadata in `sources`, not inside a node.

## 4. Draft and Audit Propositions

Write a proposition table before choosing layout. Read every row as `concept → linking phrase → concept`. Each row must be a useful claim, not a caption, branch name, or navigation cue.

| ID | From | Linking phrase | To | Evidence |
|---|---|---|---|---|
| P1 | Paid work | provides | income | interview-01 |
| P2 | Side projects | develop | skills | interview-01 |
| P3 | Skills | support | paid work | interview-01 |

Treat distinctions the user supplied as a prompt to find relationships. Do not make them separate top-level branches by default. Add a cross-link only when it joins distinct regions and strengthens the answer to the focus question.

### Compact Repair Example

**Bad topic tree** — it sorts labels but claims nothing:

```text
Work
├── Paid work
└── Side projects
```

**Proposition network repair** — it makes the claimed relationships inspectable:

```text
Paid work → provides → Income
Side projects → develop → Skills
Skills → support → Paid work
```

The second form can still be laid out with the two work modes in different regions, but the regions follow the propositions; they do not replace them.

## 5. Interactive Proposition Checkpoint

When the user can respond, present:

1. the confirmed focus question;
2. the audited parking lot, including concepts excluded as metadata; and
3. the proposition table, with source references where applicable.

Ask for corrections or approval before creating JSON, coordinates, Mermaid, SVG, HTML, or publication content. For an explicitly asynchronous draft, label the checkpoint as pending rather than silently treating it as approved.

## 6. Semantic Pre-Render Audit

Before rendering, check all of the following:

- Every edge reads as a useful sentence in its arrow direction.
- Concept labels are concise and are not sentence-like claims.
- Linking phrases carry a relationship; they are not labels such as `context`, `options`, or `next`.
- Each concept has one canonical label and ID; synonyms are merged only after checking that they mean the same thing in context.
- Context, source, task, and status metadata remain outside concept nodes.
- Cross-links integrate map regions and answer the focus question rather than decorating the canvas.
- Every proposition that relies on evidence has valid `source_refs` into the `sources` registry.
- The planned visual is a view of the proposition model, not an independently designed diagram.

The renderer's warnings are prompts for human review, not a substitute for this audit. Expert language can be concise, technical, or elliptical in legitimate ways.

## 7. Artifact Publication Recipe

1. Save the approved proposition model as JSON using `map-schema.md`.
2. Run `python scripts/cmap_artifact.py MAP.json --out-dir OUTPUT_DIR`.
3. Inspect the generated HTML and Markdown: canvas, proposition table, source references, and warnings. Correct JSON and re-render if the visual reveals a problem.
4. Publish the inspected generated HTML artifact or a faithful image of it through the chosen visual surface, **plus** the generated proposition table. Include a link/download to the JSON when practical.
5. Do not hand-draw a substitute SVG, Mermaid-only tree, or branch diagram for publication. Those can drift from the inspectable proposition model.

The visual surface presents the generated artifact and collects feedback; it does not replace the domain workflow. A compact proposition table beside the artifact preserves inspectability even where the surface cannot load the standalone HTML.
