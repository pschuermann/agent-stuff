---
name: sci-research-workflows
description: Auditable research workflow for deep research briefs, evidence tables, citations, source-grounded writing, final artifacts, and provenance. Use when the user asks for research, deep research, a sourced brief, evidence-backed synthesis, provenance, or a repeatable research process.
---

# Sci Research Workflows

Use this skill for source-grounded research where auditability matters.

## Core rules

- Plan before broad work.
- Gather evidence into files before synthesis.
- Draft from recorded evidence, not memory.
- Cite important factual claims or mark them as inference/unverified.
- Write a final artifact and a provenance sidecar.
- Ask before overwriting existing artifacts.
- Do not over-spawn subagents: use none for small tasks; use them only when scope clearly benefits.

## Default artifact layout

```text
outputs/.plans/<slug>.md
outputs/.drafts/<slug>-notes.md
outputs/.drafts/<slug>-draft.md
outputs/.drafts/<slug>-cited.md
outputs/<slug>.md
outputs/<slug>.provenance.md
```

## Workflow

1. Choose a short filesystem-safe slug.
2. Create `outputs/`, `outputs/.plans/`, and `outputs/.drafts/` if needed.
3. Write `outputs/.plans/<slug>.md` with objective, key questions, evidence needed, source strategy, likely artifacts, task ledger, verification log, and open decisions.
4. If the task is broad, expensive, or ambiguous, pause for confirmation.
5. Gather evidence into `outputs/.drafts/<slug>-notes.md` with this table:

   ```md
   | Source | URL / identifier | Type | Relevant claims | Limits / caveats | Used for |
   |---|---|---|---|---|---|
   ```

6. Draft to `outputs/.drafts/<slug>-draft.md`.
7. Add citations to `outputs/.drafts/<slug>-cited.md`.
8. Review for unsupported claims, missing citations, overclaiming, single-source critical claims, unverified quantitative claims, and unclear inference vs observation.
9. Write the final artifact to `outputs/<slug>.md`.
10. Write `outputs/<slug>.provenance.md` with topic/date, artifact paths, source discovery steps, files read, sources used/rejected, unresolved claims, confidence notes, and review summary.

Prefer `/sci-plan` or `/sci-research` when available. Otherwise follow the same workflow manually.
