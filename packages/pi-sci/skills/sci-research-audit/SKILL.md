---
name: sci-research-audit
description: Audit papers, reports, benchmarks, or claim sets against linked code, data, configs, docs, and public artifacts to find reproducibility gaps, implementation mismatches, missing evidence, and unsupported quantitative claims. Use when the user asks for a paper/code audit, reproducibility audit, implementation audit, or to compare research claims against artifacts.
---

# Sci Research Audit

Use this skill to audit research claims against implementation, data, configs, docs, and other public artifacts.

Prefer `/sci-audit` when available. Otherwise follow the same workflow manually.

## Rules

- Execute the audit and write artifacts; do not merely explain the audit method.
- Stay read-only by default. Do not run untrusted code, install dependencies, train models, mutate repositories, or launch long-running jobs without explicit user approval.
- Inspect user-provided URLs or local paths before broad search.
- Do not infer implementation details from the paper/report alone.
- Do not claim a method is implemented, absent, reproducible, verified, or contradicted unless you inspected the relevant artifact or clearly state the search scope.
- Treat quantitative claims, benchmark tables, figures, ablations, and dataset sizes as high-risk until traced to source artifacts.
- Label unavailable checks `BLOCKED` and unchecked claims `UNVERIFIED`.
- Verify final files exist before claiming completion.

## Artifacts

```text
outputs/.plans/<slug>-audit-plan.md
outputs/.drafts/<slug>-audit-evidence.md
outputs/<slug>-audit.md
outputs/<slug>.provenance.md
```

## Audit focus

- claimed method vs implemented method
- defaults, hyperparameters, prompts, preprocessing, and evaluation settings
- dataset availability, licensing, schema/splits, and leakage risks
- benchmark/evaluation reproducibility and metric definitions
- missing training/inference/evaluation code
- ambiguous commands, environment, seeds, hardware, checkpoints, or versions
- figures/tables/results without raw artifact provenance
- mismatches between README/docs/examples and paper/report claims

## Workflow

1. Choose a short filesystem-safe slug and create required directories.
2. Write `outputs/.plans/<slug>-audit-plan.md` with target identifier, claims to check, expected artifacts, read-only inspection plan, execution boundary, task ledger, and verification log.
3. Inspect the paper/report/claim set and reachable implementation/data evidence.
4. Write evidence notes to `outputs/.drafts/<slug>-audit-evidence.md` with stable IDs:

   ```md
   | ID | Artifact / source | Path / URL | Type | Relevant evidence | Limits / caveats |
   |---|---|---|---|---|---|
   ```

5. Build a claim-to-artifact matrix:

   ```md
   | Claim | Expected support | Evidence found | Status | Risk |
   |---|---|---|---|---|
   ```

6. Write `outputs/<slug>-audit.md` with executive summary, scope and execution boundary, claim-to-artifact matrix, supported claims, mismatches, missing artifacts, reproducibility risks, blocked/unverified checks, recommended fixes, and inspected sources/artifacts.
7. Write provenance with target, date, artifact paths, files read, source discovery steps, checks performed/not run, blocked capabilities, and confidence notes.
