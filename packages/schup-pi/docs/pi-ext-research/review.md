# Research: Pi packages/extensions for review workflows

## Summary

Best review-oriented candidates from the local Pi catalog are **pi-lens**, **@plannotator/pi-extension**, **pi-simplify**, **@juicesharp/rpiv-advisor**, and **pi-studio** for direct code-review/quality feedback, with **pi-subagents**, **pi-web-access**, and **context-mode** as review-enablers for second opinions, evidence gathering, and maintainability context. Evidence is from `/tmp/pi_candidates_enriched.json` plus GitHub activity snapshots in `/tmp/pi_candidate_gh_stats.json`; no packages were installed and no browser sources were used.

## Findings

1. **pi-lens — strongest direct quality-feedback candidate.** Catalog describes “real-time code feedback” spanning LSP, linters, formatters, type-checking, structural analysis, duplicate detection and quality tooling; evidence: 24.4K monthly downloads, latest 3.8.61, 115 versions, modified 2026-06-25, test/integration/typecheck/check scripts, postinstall grammar download. Trust concerns: broad tool surface and `postinstall` download should be manually audited; GitHub stats were not present in the stats artifact. [Catalog](file:///tmp/pi_candidates_enriched.json)
2. **@plannotator/pi-extension — best PR/diff/plan annotation workflow.** Catalog explicitly says “interactive plan review with annotations” and “review code/PRs”; evidence: 28.4K monthly downloads, latest 0.21.2, 81 versions, modified 2026-06-25. GitHub stats are strong: 6,523 stars, 465 forks, 743 estimated commits, latest commit 2026-06-26, but 117 open issues. Trust concerns: large issue count, package build copies vendored UI artifacts; inspect vendoring and local UI trust boundary. [Catalog](file:///tmp/pi_candidates_enriched.json), [GitHub stats](file:///tmp/pi_candidate_gh_stats.json)
3. **pi-simplify — narrow maintainability reviewer.** Catalog describes reviewing recently changed code for clarity, consistency, and maintainability; evidence: 22.8K monthly downloads, latest 0.2.2, only 3 versions, modified 2026-05-24; scripts include build, typecheck, vitest, eslint, and prepublish checks. Trust concerns: relatively young/small release history and GitHub stats were not available in the stats artifact; inspect source and examples before use. [Catalog](file:///tmp/pi_candidates_enriched.json)
4. **@juicesharp/rpiv-advisor — purpose-built second opinion.** Catalog says it lets the model request a stronger reviewer model before acting; evidence: 14.4K monthly downloads, latest 1.20.0, 104 versions, modified 2026-06-15, `vitest run` test script. Shared monorepo evidence is strong: 432 stars, 57 forks, 1,075 estimated commits, latest commit 2026-06-20. Trust concerns: monorepo contains many packages, so inspect package-specific code path and model/API routing. [Catalog](file:///tmp/pi_candidates_enriched.json), [GitHub stats](file:///tmp/pi_candidate_gh_stats.json)
5. **pi-studio — review workspace with critiques and annotations.** Catalog describes a two-pane browser workspace for prompt/response editing, annotations, critiques, history, previews, and REPL workflows; evidence: 7.9K monthly downloads, latest 0.9.33, 134 versions, modified 2026-06-16, test/typecheck scripts. GitHub stats: 178 stars, 6 forks, 301 estimated commits, latest commit 2026-06-16. Trust concerns: local browser UI expands attack surface; inspect how it serves files and handles workspace permissions. [Catalog](file:///tmp/pi_candidates_enriched.json), [GitHub stats](file:///tmp/pi_candidate_gh_stats.json)
6. **pi-subagents — useful for parallel review/second-opinion fanout.** Catalog categories include review/focus_task/multisession and description supports delegating tasks to subagents; evidence: 94.9K monthly downloads, latest 0.31.0, 84 versions, modified 2026-06-24, unit/integration test scripts. GitHub stats are high: 2,335 stars, 320 forks, 400 estimated commits, latest commit 2026-06-26. Trust concerns: broad orchestration powers and session sharing; manually inspect isolation, artifact handling, and whether review workers can mutate code. [Catalog](file:///tmp/pi_candidates_enriched.json), [GitHub stats](file:///tmp/pi_candidate_gh_stats.json)
7. **pi-web-access — useful evidence-gathering companion for reviews.** Catalog supports web search, URL fetch, GitHub repo cloning, PDF extraction and video analysis; evidence: 118.3K monthly downloads, latest 0.13.0, 19 versions, modified 2026-06-25, `node --test`. GitHub stats: 705 stars, 111 forks, 66 estimated commits, latest commit 2026-06-25. Trust concerns: network/API-provider tool with broad exfiltration risk; review provider configuration, secrets handling, and fetch/clone sandboxing. [Catalog](file:///tmp/pi_candidates_enriched.json), [GitHub stats](file:///tmp/pi_candidate_gh_stats.json)
8. **context-mode — maintainability/context reviewer enabler, not direct PR review.** Catalog emphasizes context-window savings, sandboxed code execution, FTS5 knowledge base, intent-driven search, and ecosystem support; evidence: 105.2K monthly downloads, latest 1.0.168, 222 versions, modified 2026-06-26, extensive build/test/benchmark scripts. GitHub stats are very strong: 18,224 stars, 1,280 forks, 2,049 estimated commits, latest commit 2026-06-26. Trust concerns: has postinstall, bundled hooks, sandboxed code execution, and cross-platform integrations; needs deeper security review before adoption. [Catalog](file:///tmp/pi_candidates_enriched.json), [GitHub stats](file:///tmp/pi_candidate_gh_stats.json)

## Sources

- Kept: `/tmp/pi_candidates_enriched.json` — primary local catalog artifact with Pi package names, descriptions, downloads, versions, npm timestamps, manifests, scripts, and repo links.
- Kept: `/tmp/pi_candidate_gh_stats.json` — local GitHub activity snapshot with stars, forks, issues, estimated commit counts, push/latest-commit dates, and archived status.
- Dropped: browser/web sources — excluded per task; no package pages were opened in a browser and no packages were installed.
- Dropped: lower-fit packages such as pi-powerline-footer, pi-tool-display, pi-markdown-preview, pi-guardrails, pi-chrome, pi-cache-optimizer — useful adjacent tooling, but less directly tied to code review/second-opinion/maintainability feedback than the top 8.

## Gaps

- GitHub stats were absent in the local stats artifact for some high-fit packages, notably **pi-lens**, **pi-simplify**, and **@hypabolic/pi-hypa**.
- Local artifacts do not prove package behavior or supply-chain safety; they show metadata, scripts, descriptions, and repo activity only.
- Suggested next steps: manually inspect (1) `pi-lens` postinstall/downloaded grammars and tool execution paths, (2) `@plannotator/pi-extension` UI/vendoring/diff-permission model, and (3) `pi-simplify` reviewer prompt/source and whether it is read-only by default.

## Recommended next manual inspections

1. **pi-lens**: inspect `postinstall`, grammar download script, linter/typecheck invocation paths, and whether it sends code outside the machine.
2. **@plannotator/pi-extension**: inspect UI server/auth, vendored assets, PR/diff ingestion, and how annotations are written back.
3. **pi-simplify + @juicesharp/rpiv-advisor**: compare review output quality on the same local diff; verify whether either can operate in read-only mode.

## Supervisor coordination

No coordination was needed; the task was completed from local artifacts only.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Researched only the requested local Pi catalog artifacts for review/second-opinion/PR-diff/maintainability candidates; did not install packages or widen scope."
    }
  ],
  "changedFiles": [
    "/Users/pschuermann/.pi/agent/sessions/--Users-pschuermann-repos-browser--/subagent-artifacts/progress/a3ebc775/progress.md",
    "/Users/pschuermann/repos/browser/pi-ext-research/review.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "read /tmp/pi_candidates_enriched.json",
      "result": "passed",
      "summary": "Inspected local enriched Pi package catalog."
    },
    {
      "command": "read /tmp/pi_candidate_gh_stats.json",
      "result": "passed",
      "summary": "Inspected local GitHub stats artifact."
    },
    {
      "command": "write /Users/pschuermann/repos/browser/pi-ext-research/review.md",
      "result": "passed",
      "summary": "Wrote research brief to required output path."
    }
  ],
  "validationOutput": [
    "No packages installed; findings are based on local JSON artifacts only."
  ],
  "residualRisks": [
    "GitHub stats missing for some candidates in local artifact; manual source review still required before trusting any extension."
  ],
  "noStagedFiles": true,
  "diffSummary": "Added review workflow research brief and progress note only.",
  "reviewFindings": [
    "no blockers"
  ],
  "manualNotes": "No browser sources used; no package installation performed."
}
```
