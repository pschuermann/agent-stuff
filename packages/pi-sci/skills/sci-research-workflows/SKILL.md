---
name: sci-research-workflows
description: Auditable research workflow for deep research briefs, evidence tables, citations, source-grounded writing, final artifacts, and provenance. Use when the user asks for research, deep research, a sourced brief, evidence-backed synthesis, provenance, or a repeatable research process.
---

# Sci Research Workflows

Use this skill for source-grounded research where auditability matters.

Prefer `/sci-plan` or `/sci-research` when available. Otherwise follow the same workflow manually.

## Core rules

- Execute the workflow; do not merely explain it.
- Plan before broad work.
- Gather evidence into files before synthesis.
- Draft from recorded evidence, not memory.
- Cite important factual claims or mark them as inference/`UNVERIFIED`.
- Write a final artifact and a provenance sidecar.
- Ask before overwriting existing artifacts.
- Continue in degraded mode when a capability is missing; record `BLOCKED: <specific capability>`.
- Verify final files exist before claiming the work is complete.

## Evidence integrity

- Do not invent sources, source contents, URLs, papers, authors, datasets, numbers, or results.
- Prefer primary sources, official docs/data, papers, standards, direct statements, and raw artifacts.
- Read or inspect a source before using it as support. Snippets can guide discovery, not final claims.
- Distinguish observation, inference, interpretation, and speculation.
- Critical numbers, results, figures, tables, and benchmark claims need explicit provenance: source URL, local artifact path, or command output.
- Citation presence is not enough; the source must support the exact claim.

## Scale rules

- Use lead-owned direct research for narrow questions and small explainers.
- Use subagents only when decomposition clearly improves coverage or reduces context pressure.
- If subagents are used, the lead agent still owns the plan, synthesis, final claims, and provenance.
- Record the scale decision and reason in the plan.

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
3. Write `outputs/.plans/<slug>.md` with objective, key questions, evidence needed, source strategy, scale decision, task ledger, verification log, and open decisions.
4. If the task is broad, expensive, or ambiguous, pause for confirmation.
5. Gather evidence into `outputs/.drafts/<slug>-notes.md` with stable source IDs:

   ```md
   | ID | Source | URL / identifier | Type | Relevant claims | Limits / caveats | Used for |
   |---|---|---|---|---|---|---|
   ```

6. Record search queries, files read, rejected sources, and blocked capabilities.
7. Draft to `outputs/.drafts/<slug>-draft.md`.
8. Add citations to `outputs/.drafts/<slug>-cited.md`.
9. Review for unsupported claims, missing citations, overclaiming, single-source critical claims, unverified quantitative claims, and unclear inference vs observation.
10. Fix FATAL issues before finalizing; disclose unresolved MAJOR issues.
11. Write the final artifact to `outputs/<slug>.md`.
12. Write `outputs/<slug>.provenance.md` with topic/date, artifact paths, scale decision, source discovery steps, files read, sources used/rejected, unresolved claims, blocked capabilities, confidence notes, and review summary.
