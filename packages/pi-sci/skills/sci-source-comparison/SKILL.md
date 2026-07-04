---
name: sci-source-comparison
description: Compare claims across multiple sources with source tables, claim matrices, agreements, contradictions, confidence levels, and strongest supported conclusions. Use when the user asks to compare sources, reconcile claims, check contradictions, or evaluate competing accounts.
---

# Sci Source Comparison

Use this skill when comparing sources or claims.

Prefer `/sci-compare` when available. Otherwise follow the same workflow manually.

## Rules

- Execute the comparison with artifacts; do not merely explain the method.
- If concrete sources are provided, prioritize those before discovering more.
- If only a topic is provided, gather a small defensible source set and explain selection.
- Compare claims directly; do not merely summarize each source.
- Weight sources by primary evidence, directness, recency, methodology, and conflicts of interest.
- A citation supports a claim only if the source actually says or demonstrates the specific point.
- Mark uncertainty, unresolved contradictions, and blocked checks.
- Verify final files exist before claiming completion.

## Artifacts

```text
outputs/.plans/<slug>.md
outputs/.drafts/<slug>-comparison-notes.md
outputs/<slug>-comparison.md
outputs/<slug>.provenance.md
```

## Workflow

1. Choose a short filesystem-safe slug and create required directories.
2. Write a plan describing the source set, comparison dimensions, confidence criteria, and missing sources.
3. Write notes to `outputs/.drafts/<slug>-comparison-notes.md`.
4. Include a source table with stable IDs:

   ```md
   | ID | Source | URL / identifier | Type | Date | Perspective / interest | Strengths | Limits |
   |---|---|---|---|---|---|---|---|
   ```

5. Include a claim matrix:

   ```md
   | Claim / question | S1 | S2 | S3 | Agreement? | Confidence | Notes |
   |---|---|---|---|---|---|---|
   ```

6. Write `outputs/<slug>-comparison.md` with summary, scope and source-selection rationale, source table, claim matrix, agreements, contradictions, confidence levels, strongest supported conclusion, and what would change the conclusion.
7. Write provenance with source-selection rationale, discovery steps, files read, rejected sources, blocked capabilities, and unresolved issues.
