---
description: Produce an auditable paper-focused literature review
argument-hint: "<topic>"
---

Prepare a literature review for: $ARGUMENTS

If no topic was provided, ask for the topic and stop.

This is an execution request. Do not answer by explaining how to do a literature review. Execute the workflow with durable artifacts.

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
- Do not fabricate papers, authors, publication venues, DOIs, arXiv IDs, claims, scores, or URLs.
- Do not infer a paper's claims from the title alone. Inspect the abstract/full text/metadata page or mark the source as uninspected.
- Mark inaccessible, abstract-only, paywalled, PDF-parse-failed, or secondhand sources clearly.
- Cite with URL, DOI, arXiv ID, ISBN, or local file path.
- Separate consensus from repeated self-claims. Multiple papers from the same group are not independent confirmation unless the relationship is disclosed.
- If source discovery is incomplete, still write the review and mark coverage limits explicitly.

Workflow:

1. Write a plan to `outputs/.plans/<slug>.md` with scope, time period if relevant, source strategy, scale decision, task ledger, and verification log.
2. Build a reading map in `outputs/.drafts/<slug>-notes.md` with stable source IDs:

   ```md
   | ID | Source | Identifier / URL | Year | Type | Contribution | Evidence strength | Caveats |
   |---|---|---|---:|---|---|---|---|
   | S1 | ... | ... | ... | paper / survey / standard / dataset | ... | high / medium / low | ... |
   ```

3. Group sources by theme, method, lineage, or debate. For each group, distinguish:
   - what the source directly shows
   - what later sources infer from it
   - what remains unresolved
4. Identify consensus, disagreements, open questions, methodological weak spots, and missing primary evidence.
5. Write `outputs/<slug>-lit-review.md` with these sections:
   - Executive summary
   - Scope and coverage limits
   - Reading map
   - Important papers / sources
   - Consensus
   - Disagreements
   - Open questions
   - Recommended reading order
   - References
6. Write `outputs/<slug>.provenance.md` with discovery steps, queries, files read, sources included/excluded, coverage limits, blocked capabilities, and unresolved verification issues.
7. Before the final response, verify on disk that the review and provenance files exist.

Final response: list artifact paths, top 3 takeaways, and any coverage limits or blocked checks.
