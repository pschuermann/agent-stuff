---
description: Compare claims across sources and identify agreements, contradictions, and confidence
argument-hint: "<sources-or-topic>"
---

Compare sources or claims for: $ARGUMENTS

If no sources, claims, or topic were provided, ask for them and stop.

This is an execution request. Do not answer by explaining the comparison method. Build the artifacts and then summarize the result.

Use the Sci source-comparison workflow. The goal is not just to summarize each source, but to compare their claims and show which conclusions are best supported.

Artifacts:

- `outputs/.plans/<slug>.md`
- `outputs/.drafts/<slug>-comparison-notes.md`
- `outputs/<slug>-comparison.md`
- `outputs/<slug>.provenance.md`

Rules:

- Choose a short, filesystem-safe slug.
- Create required directories.
- Ask before overwriting existing artifacts unless overwrite was explicitly requested.
- If concrete sources are provided, prioritize those before discovering more.
- If only a topic is provided, gather a small, defensible source set and explain the selection.
- Do not average together unequal sources. Weight primary evidence, recency, methodology, directness, and conflicts of interest.
- Do not treat citation presence as support. A source supports a claim only if it actually says or demonstrates the specific point.
- Mark contradictions as contradictions; do not smooth them into a false consensus.
- Label unresolved claims `UNVERIFIED` and unavailable checks `BLOCKED`.

Workflow:

1. Write a brief plan to `outputs/.plans/<slug>.md` describing the source set, comparison dimensions, confidence criteria, and any missing sources.
2. Identify the source set and write notes to `outputs/.drafts/<slug>-comparison-notes.md`.
3. Include a source table with stable IDs:

   ```md
   | ID | Source | URL / identifier | Type | Date | Perspective / interest | Strengths | Limits |
   |---|---|---|---|---|---|---|---|
   | S1 | ... | ... | primary / secondary / vendor / critique | ... | ... | ... | ... |
   ```

4. Extract comparable claims into a claim matrix:

   ```md
   | Claim / question | S1 | S2 | S3 | Agreement? | Confidence | Notes |
   |---|---|---|---|---|---|---|
   ```

   Use short source-ID references in cells. Quote or paraphrase narrowly enough that disagreements remain visible.
5. Write `outputs/<slug>-comparison.md` with:
   - Summary
   - Scope and source-selection rationale
   - Source table
   - Claim matrix
   - Agreements
   - Contradictions / tensions
   - Confidence levels
   - Strongest supported conclusion
   - What would change the conclusion
6. Write `outputs/<slug>.provenance.md` with source-selection rationale, discovery steps, files read, rejected sources, blocked capabilities, and unresolved issues.
7. Before the final response, verify on disk that the comparison and provenance files exist.

Final response: list artifact paths and the strongest supported conclusion with caveats.
