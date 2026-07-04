---
description: Compare claims across sources and identify agreements, contradictions, and confidence
argument-hint: "<sources-or-topic>"
---

Compare sources or claims for: $ARGUMENTS

If no sources, claims, or topic were provided, ask for them and stop.

Use the Sci source-comparison workflow. The goal is not just to summarize each source, but to compare their claims and show which conclusions are best supported.

Artifacts:

- `outputs/.drafts/<slug>-comparison-notes.md`
- `outputs/<slug>-comparison.md`
- `outputs/<slug>.provenance.md`

Rules:

- Choose a short, filesystem-safe slug.
- Create required directories.
- Ask before overwriting existing artifacts unless overwrite was explicitly requested.
- If concrete sources are provided, prioritize those before discovering more.
- If only a topic is provided, gather a small, defensible source set and explain the selection.
- Do not average together unequal sources. Weight primary evidence, recency, methodology, and directness.

Workflow:

1. Identify the source set and write notes to `outputs/.drafts/<slug>-comparison-notes.md`.
2. Include a source table:

   ```md
   | Source | URL / identifier | Type | Date | Perspective / interest | Strengths | Limits |
   |---|---|---|---|---|---|---|
   ```

3. Extract comparable claims into a claim matrix:

   ```md
   | Claim / question | Source A | Source B | Source C | Agreement? | Confidence | Notes |
   |---|---|---|---|---|---|---|
   ```

4. Write `outputs/<slug>-comparison.md` with:
   - Summary
   - Source table
   - Claim matrix
   - Agreements
   - Contradictions / tensions
   - Confidence levels
   - Strongest supported conclusion
   - What would change the conclusion
5. Write `outputs/<slug>.provenance.md` with source-selection rationale, discovery steps, files read, and unresolved issues.

Final response: list artifact paths and the strongest supported conclusion with caveats.
