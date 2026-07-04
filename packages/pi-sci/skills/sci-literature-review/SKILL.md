---
name: sci-literature-review
description: Paper-focused literature review workflow with reading maps, consensus, disagreements, open questions, recommended reading order, source identifiers, and provenance. Use when the user asks for a literature review, paper review, survey, related work, or research reading map.
---

# Sci Literature Review

Use this skill for paper-focused reviews and related-work surveys.

Prefer `/sci-lit` when available. Otherwise follow the same workflow manually.

## Rules

- Execute the workflow with artifacts; do not merely explain how to review literature.
- Prefer papers, preprints, books, standards, datasets, and other citable research sources.
- Inspect user-provided PDFs, bibliographies, paper folders, or identifiers before searching broadly.
- Do not fabricate papers, authors, venues, DOIs, arXiv IDs, claims, scores, or URLs.
- Do not infer a paper's claims from the title alone.
- Mark abstract-only, inaccessible, paywalled, PDF-parse-failed, or secondhand sources clearly.
- Cite with URL, DOI, arXiv ID, ISBN, or local file path.
- Separate consensus from repeated self-claims; related papers from one lab are not independent confirmation unless disclosed.
- Verify final files exist before claiming completion.

## Artifacts

```text
outputs/.plans/<slug>.md
outputs/.drafts/<slug>-notes.md
outputs/<slug>-lit-review.md
outputs/<slug>.provenance.md
```

## Workflow

1. Choose a short filesystem-safe slug and create required directories.
2. Write a plan to `outputs/.plans/<slug>.md` with scope, source strategy, scale decision, task ledger, and verification log.
3. Build a reading map in `outputs/.drafts/<slug>-notes.md` with stable source IDs:

   ```md
   | ID | Source | Identifier / URL | Year | Type | Contribution | Evidence strength | Caveats |
   |---|---|---|---:|---|---|---|---|
   ```

4. Group sources by theme, method, lineage, or debate.
5. Identify consensus, disagreements, open questions, methodological weak spots, and missing primary evidence.
6. Write `outputs/<slug>-lit-review.md` with executive summary, scope and coverage limits, reading map, important sources, consensus, disagreements, open questions, recommended reading order, and references.
7. Write provenance with discovery steps, queries, files read, sources included/excluded, coverage limits, blocked capabilities, and unresolved verification issues.
