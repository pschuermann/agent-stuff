---
description: Run an auditable source-grounded research workflow with provenance
argument-hint: "<topic>"
---

Research and write a source-grounded brief about: $ARGUMENTS

If no topic was provided, ask for the topic and stop.

Use the Sci research workflow. Be auditable and conservative: gather evidence into files before synthesis, cite factual claims, and mark uncertainty plainly.

Artifact layout:

- `outputs/.plans/<slug>.md`
- `outputs/.drafts/<slug>-notes.md`
- `outputs/.drafts/<slug>-draft.md`
- `outputs/.drafts/<slug>-cited.md`
- `outputs/<slug>.md`
- `outputs/<slug>.provenance.md`

Rules:

- Choose a short, filesystem-safe slug from the topic.
- Create required directories before writing artifacts.
- If any target artifact already exists, ask before overwriting unless the user explicitly requested overwrite.
- Do not over-spawn subagents. Use no subagents for small tasks; use them only when the scope clearly benefits and say why.
- Use available web/search/document tools only as needed. Do not invent sources.
- Every important factual claim in the final artifact must be cited, marked as inference, or explicitly labeled unverified.
- Prefer primary sources, official docs/data, papers, standards, and direct statements over summaries.

Workflow:

1. Write a plan to `outputs/.plans/<slug>.md` with objective, key questions, evidence needed, source strategy, task ledger, verification log, and open decisions.
2. If the task is broad, expensive, or ambiguous, pause after the plan and ask for confirmation.
3. Gather evidence and write `outputs/.drafts/<slug>-notes.md` before drafting. Include an evidence table:

   ```md
   | Source | URL / identifier | Type | Relevant claims | Limits / caveats | Used for |
   |---|---|---|---|---|---|
   ```

4. Draft findings in `outputs/.drafts/<slug>-draft.md` using only the gathered evidence plus clearly labeled background knowledge.
5. Add citations/source links in `outputs/.drafts/<slug>-cited.md`.
6. Self-review the cited draft for unsupported claims, missing citations, overclaiming, single-source critical claims, unverified numbers, and unclear inference vs observation.
7. Write the final brief to `outputs/<slug>.md`.
8. Write provenance to `outputs/<slug>.provenance.md` with:
   - topic and date
   - artifact paths
   - search queries / source discovery steps
   - files read
   - sources used and rejected
   - unresolved or unverified claims
   - confidence notes
   - review summary

Final response:

- list artifact paths created
- summarize the answer in 3-6 bullets
- disclose any unverified claims or important caveats
