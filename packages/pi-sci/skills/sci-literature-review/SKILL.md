---
name: sci-literature-review
description: Paper-focused literature review workflow with reading maps, consensus, disagreements, open questions, recommended reading order, source identifiers, and provenance. Use when the user asks for a literature review, paper review, survey, related work, or research reading map.
---

# Sci Literature Review

Use this skill for paper-focused reviews and related-work surveys.

## Rules

- Prefer papers, preprints, books, standards, datasets, and other citable research sources.
- Inspect user-provided PDFs, bibliographies, paper folders, or identifiers before searching broadly.
- Do not fabricate papers, authors, venues, DOIs, arXiv IDs, or URLs.
- Mark abstract-only, inaccessible, or secondhand sources clearly.
- Cite with URL, DOI, arXiv ID, ISBN, or local file path.

## Artifacts

```text
outputs/.plans/<slug>.md
outputs/.drafts/<slug>-notes.md
outputs/<slug>-lit-review.md
outputs/<slug>.provenance.md
```

## Workflow

1. Choose a short filesystem-safe slug and create required directories.
2. Write a plan to `outputs/.plans/<slug>.md`.
3. Build a reading map in `outputs/.drafts/<slug>-notes.md`:

   ```md
   | Source | Identifier / URL | Year | Type | Contribution | Evidence strength | Caveats |
   |---|---|---:|---|---|---|---|
   ```

4. Group sources by theme, method, lineage, or debate.
5. Identify consensus, disagreements, open questions, and weak spots.
6. Write `outputs/<slug>-lit-review.md` with executive summary, reading map, important sources, consensus, disagreements, open questions, recommended reading order, and references.
7. Write provenance with discovery steps, queries, files read, sources included/excluded, and unresolved verification issues.

Prefer `/sci-lit` when available. Otherwise follow the same workflow manually.
