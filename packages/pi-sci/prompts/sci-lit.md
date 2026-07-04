---
description: Produce an auditable paper-focused literature review
argument-hint: "<topic>"
---

Prepare a literature review for: $ARGUMENTS

If no topic was provided, ask for the topic and stop.

Use a paper-focused Sci workflow. Prefer papers, preprints, books, standards, datasets, and other citable research sources. If local PDFs, bibliographies, paper folders, or specific identifiers are provided, inspect those before searching more broadly.

Artifacts:

- `outputs/.plans/<slug>.md`
- `outputs/.drafts/<slug>-notes.md`
- `outputs/<slug>-lit-review.md`
- `outputs/<slug>.provenance.md`

Rules:

- Choose a short, filesystem-safe slug from the topic.
- Create required directories.
- Ask before overwriting existing artifacts unless overwrite was explicitly requested.
- Do not fabricate papers, authors, publication venues, DOIs, arXiv IDs, or URLs.
- Mark inaccessible, abstract-only, or secondhand sources clearly.
- Cite each factual claim with a URL, DOI, arXiv ID, ISBN, or local file path.

Workflow:

1. Write a plan to `outputs/.plans/<slug>.md`.
2. Build a reading map in `outputs/.drafts/<slug>-notes.md`:

   ```md
   | Source | Identifier / URL | Year | Type | Contribution | Evidence strength | Caveats |
   |---|---|---:|---|---|---|---|
   ```

3. Group sources by theme, method, lineage, or debate.
4. Identify consensus, disagreements, open questions, and weak spots in the evidence.
5. Write `outputs/<slug>-lit-review.md` with these sections:
   - Executive summary
   - Reading map
   - Important papers / sources
   - Consensus
   - Disagreements
   - Open questions
   - Recommended reading order
   - References
6. Write `outputs/<slug>.provenance.md` with discovery steps, queries, files read, sources included/excluded, and unresolved verification issues.

Final response: list artifact paths and the top 3 takeaways.
