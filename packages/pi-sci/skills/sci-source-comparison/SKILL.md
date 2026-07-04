---
name: sci-source-comparison
description: Compare claims across multiple sources with source tables, claim matrices, agreements, contradictions, confidence levels, and strongest supported conclusions. Use when the user asks to compare sources, reconcile claims, check contradictions, or evaluate competing accounts.
---

# Sci Source Comparison

Use this skill when comparing sources or claims.

## Rules

- If concrete sources are provided, prioritize those before discovering more.
- If only a topic is provided, gather a small defensible source set and explain selection.
- Compare claims directly; do not merely summarize each source.
- Weight sources by primary evidence, directness, recency, methodology, and conflicts of interest.
- Mark uncertainty and unresolved contradictions.

## Artifacts

```text
outputs/.drafts/<slug>-comparison-notes.md
outputs/<slug>-comparison.md
outputs/<slug>.provenance.md
```

## Workflow

1. Choose a short filesystem-safe slug and create required directories.
2. Write notes to `outputs/.drafts/<slug>-comparison-notes.md`.
3. Include a source table:

   ```md
   | Source | URL / identifier | Type | Date | Perspective / interest | Strengths | Limits |
   |---|---|---|---|---|---|---|
   ```

4. Include a claim matrix:

   ```md
   | Claim / question | Source A | Source B | Source C | Agreement? | Confidence | Notes |
   |---|---|---|---|---|---|---|
   ```

5. Write `outputs/<slug>-comparison.md` with summary, source table, claim matrix, agreements, contradictions, confidence levels, strongest supported conclusion, and what would change the conclusion.
6. Write provenance with source-selection rationale, discovery steps, files read, and unresolved issues.

Prefer `/sci-compare` when available. Otherwise follow the same workflow manually.
