---
description: Run an auditable source-grounded research workflow with provenance
argument-hint: "<topic>"
---

Research and write a source-grounded brief about: $ARGUMENTS

If no topic was provided, ask for the topic and stop.

This is an execution request. Do not answer by explaining the Sci workflow. Execute it with available tools and durable files. Your first actions should create the artifact directories and write the plan artifact unless you must ask for the missing topic.

Use the Sci research workflow. Be auditable and conservative: gather evidence into files before synthesis, cite factual claims, and mark uncertainty plainly.

Artifact layout:

- `outputs/.plans/<slug>.md`
- `outputs/.drafts/<slug>-notes.md`
- `outputs/.drafts/<slug>-draft.md`
- `outputs/.drafts/<slug>-cited.md`
- `outputs/<slug>.md`
- `outputs/<slug>.provenance.md`

Operating rules:

- Choose a short, filesystem-safe slug from the topic.
- Create required directories before writing artifacts.
- If any target artifact already exists, ask before overwriting unless the user explicitly requested overwrite.
- Use available web/search/document tools only as needed. Do not invent sources, source contents, papers, authors, URLs, datasets, numbers, or experimental results.
- Prefer primary sources, official docs/data, papers, standards, direct statements, and raw artifacts over summaries.
- Read or inspect a source before using it as support. Search-result snippets can justify further inspection, not final claims.
- Every important factual claim in the final artifact must be cited, marked as inference, or explicitly labeled `UNVERIFIED`.
- Every critical quantitative/result claim must trace to a source URL, local artifact path, or command output. If provenance is missing, remove the claim or mark it as planned/unchecked.
- Distinguish observation, inference, interpretation, and speculation.
- If a capability is unavailable, continue in degraded mode and record `BLOCKED: <specific capability>` in notes, final output, and provenance. Do not end with chat-only output after the plan is approved.

Scale rules:

- Use lead-owned direct research for narrow questions, small explainers, or work likely answerable with a handful of source checks.
- Consider subagents only for broad, multi-source, or multi-domain work where decomposition clearly reduces context pressure or improves coverage.
- If subagents are used, keep the lead agent responsible for the plan, synthesis, final claims, and provenance. Do not delegate final judgment.
- Record the scale decision and reason in the plan.

Workflow:

1. Write a plan to `outputs/.plans/<slug>.md` with objective, key questions, evidence needed, source strategy, scale decision, task ledger, verification log, and open decisions.
2. If the task is broad, expensive, or ambiguous, pause after the plan and ask for confirmation.
3. Gather evidence and write `outputs/.drafts/<slug>-notes.md` before drafting. Include stable source IDs and an evidence table:

   ```md
   | ID | Source | URL / identifier | Type | Relevant claims | Limits / caveats | Used for |
   |---|---|---|---|---|---|---|
   | S1 | ... | ... | primary / secondary / artifact | ... | ... | ... |
   ```

   Also record search queries, files read, and rejected/low-quality sources.
4. Draft findings in `outputs/.drafts/<slug>-draft.md` using only the gathered evidence plus clearly labeled background knowledge.
5. Add inline citations/source links in `outputs/.drafts/<slug>-cited.md`. Source IDs in the notes should map cleanly to citations or links in the cited draft.
6. Self-review the cited draft for unsupported claims, missing citations, overclaiming, single-source critical claims, unverified numbers, and unclear inference vs observation. Fix FATAL issues before finalizing; disclose unresolved MAJOR issues.
7. Write the final brief to `outputs/<slug>.md`.
8. Write provenance to `outputs/<slug>.provenance.md` with:
   - topic and date
   - artifact paths
   - scale decision
   - search queries / source discovery steps
   - files read
   - sources used and rejected
   - unresolved or unverified claims
   - blocked capabilities
   - confidence notes
   - review summary
9. Before the final response, verify on disk that the final artifact and provenance file exist. If any required artifact is missing, create it or explicitly mark the run `BLOCKED` with the reason.

Final response:

- list artifact paths created
- summarize the answer in 3-6 bullets
- disclose any unverified claims, blocked checks, or important caveats
