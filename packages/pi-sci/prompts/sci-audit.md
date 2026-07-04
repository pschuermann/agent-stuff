---
description: Audit a paper, report, or claim set against linked code/data for reproducibility risks
argument-hint: "<paper-or-project>"
---

Audit this research artifact against its implementation, data, or public evidence: $ARGUMENTS

If no paper, report, repository, claim set, or project was provided, ask for the target and stop.

This is an execution request. Do not explain the audit protocol. Create the audit artifacts, inspect the target evidence, and then summarize the result.

Use the Sci audit workflow. The goal is to test whether important claims are backed by reachable artifacts: code, data, configs, scripts, reported commands, documentation, experiments, or primary sources.

Artifacts:

- `outputs/.plans/<slug>-audit-plan.md`
- `outputs/.drafts/<slug>-audit-evidence.md`
- `outputs/<slug>-audit.md`
- `outputs/<slug>.provenance.md`

Rules:

- Choose a short, filesystem-safe slug from the target.
- Create required directories.
- Ask before overwriting existing artifacts unless overwrite was explicitly requested.
- Do not run untrusted code, install dependencies, train models, mutate repositories, or launch long-running jobs unless the user explicitly approves that execution step.
- Prefer read-only inspection: paper/report text, README, docs, configs, scripts, tests, dataset cards, release artifacts, CI files, examples, and issue/PR discussions when relevant.
- Do not infer implementation details from the paper alone. Mark missing code/data/configs as gaps.
- Do not claim something is reproducible, implemented, verified, or absent unless you inspected the relevant artifact or clearly state the search scope.
- Treat quantitative claims, benchmark tables, figures, ablations, and dataset sizes as high-risk until traced to source artifacts.
- Label unavailable checks `BLOCKED` and unchecked claims `UNVERIFIED`.

Audit focus:

- claimed method vs implemented method
- reported defaults, hyperparameters, prompts, preprocessing, and evaluation settings
- dataset availability, licensing, schema/splits, and data leakage risks
- benchmark/evaluation reproducibility and metric definitions
- missing training/inference/evaluation code
- ambiguity in commands, environment, seeds, hardware, checkpoints, or versions
- figures/tables/results without raw artifact provenance
- mismatches between README/docs/examples and paper/report claims
- security or safety caveats only when directly relevant to executing the artifact

Workflow:

1. Write `outputs/.plans/<slug>-audit-plan.md` with:
   - target identifier and source type
   - claims to check
   - artifacts expected
   - read-only inspection plan
   - execution boundary / what will not be run without approval
   - task ledger
   - verification log
2. Inspect the target artifact and reachable implementation/data evidence. If the target includes URLs or local paths, inspect those first before broad search.
3. Write evidence notes to `outputs/.drafts/<slug>-audit-evidence.md` with stable IDs:

   ```md
   | ID | Artifact / source | Path / URL | Type | Relevant evidence | Limits / caveats |
   |---|---|---|---|---|---|
   | E1 | ... | ... | paper / code / config / data / docs | ... | ... |
   ```

   Also record files read, searches run, rejected sources, and blocked checks.
4. Build a claim-to-artifact matrix:

   ```md
   | Claim | Expected support | Evidence found | Status | Risk |
   |---|---|---|---|---|
   | ... | code / data / config / command / paper section | E1, E2 | supported / partial / missing / contradicted / blocked | fatal / major / minor |
   ```

5. Write `outputs/<slug>-audit.md` with:
   - Executive summary
   - Scope and execution boundary
   - Claim-to-artifact matrix
   - Supported claims
   - Mismatches / contradictions
   - Missing artifacts
   - Reproducibility risks
   - Blocked or unverified checks
   - Recommended fixes or next verification steps
   - Sources / artifacts inspected
6. Write `outputs/<slug>.provenance.md` with target, date, artifact paths, files read, source discovery steps, checks performed, checks not run, blocked capabilities, and confidence notes.
7. Before the final response, verify on disk that the audit and provenance files exist. If completion is blocked, still write a blocked audit artifact explaining exactly what failed.

Final response: list artifact paths, the top FATAL/MAJOR risks, and any blocked checks.
