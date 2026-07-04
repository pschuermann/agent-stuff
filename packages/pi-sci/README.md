# pi-sci

Auditable research workflows for Pi.

`pi-sci` is a resource-only Pi package: prompt templates plus skills. It does not register extensions, run startup code, install dependencies, send telemetry, or access browser cookies.

## Install locally

From this repository:

```sh
pi install ./packages/pi-sci
```

## Commands

- `/sci-plan <topic>` — create a research plan artifact before broad work.
- `/sci-research <topic>` — run a source-grounded research workflow with notes, draft, citations, final artifact, and provenance.
- `/sci-lit <topic>` — produce a paper-focused literature review.
- `/sci-compare <sources-or-topic>` — compare claims across sources.
- `/sci-review <file-or-claim>` — adversarially review factual support, citations, and overclaiming.

## Artifact layout

Commands write under the current workspace:

```text
outputs/
  .plans/<slug>.md
  .drafts/<slug>-notes.md
  .drafts/<slug>-draft.md
  .drafts/<slug>-cited.md
  <slug>.md
  <slug>.provenance.md
  <slug>-review.md
```

Commands should not overwrite existing artifacts without asking unless the user explicitly requested overwrite.

## Principles

- Plan before broad work.
- Gather evidence into files before synthesis.
- Draft from evidence, not memory.
- Cite factual claims with source links or identifiers.
- Mark unsupported claims and uncertainty plainly.
- Preserve provenance: searches, sources, files read, unresolved claims, and confidence notes.
