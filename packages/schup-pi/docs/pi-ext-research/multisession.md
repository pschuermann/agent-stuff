# Research: Pi multi-session / rabbithole management packages

## Summary
Best overall candidates are **pi-subagents** for general delegation/session fanout, **@quintinshaw/pi-dynamic-workflows** for heavy workflow fanout with resume/worktree isolation, and **pi-crew** for coordinated AI teams/worktrees/async task orchestration. For session recovery and rabbithole control, pair an orchestrator with **@ayulab/pi-rewind** or a session/memory layer such as **context-mode** or **pi-hermes-memory** rather than relying on orchestration alone.

## Research angles
1. Subagent delegation and async fanout.
2. Dynamic workflows, DAGs, worktrees, and task orchestration.
3. Session/rabbithole management: rewind, checkpoints, memory, session search, lineage.
4. Browser/web automation only where it improves coordination or research delegation.

## Top candidates

1. **pi-subagents** — strongest default pick for subagent delegation. NPM metadata says it delegates tasks to subagents with chains, parallel execution, and TUI clarification; package evidence also shows skills/prompts plus unit and integration tests. It has 94.9K monthly downloads, 84 versions, and a GitHub repo described as async subagent delegation with truncation, artifacts, and session sharing; repo stats show 2,335 stars, 320 forks, ~400 commits, and latest push 2026-06-26. [NPM](https://www.npmjs.com/package/pi-subagents) / [GitHub](https://github.com/nicobailon/pi-subagents)
2. **@quintinshaw/pi-dynamic-workflows** — best for large, explicit workflow fanout. Description claims Claude-Code-style dynamic workflows, 100s of subagents, model routing, token/cost accounting, resume, git-worktree isolation, `/workflows` TUI, and `/deep-research`. Evidence: 20.6K monthly downloads, 30 versions, latest modified 2026-06-26; repo has 73 stars, 19 forks, ~72 commits, and a matching GitHub description emphasizing journaled resume and worktree isolation. [NPM](https://www.npmjs.com/package/@quintinshaw/pi-dynamic-workflows) / [GitHub](https://github.com/QuintinShaw/pi-dynamic-workflows)
3. **pi-crew** — strongest “AI team” orchestration/worktree package in the local artifact. It is described as coordinated AI teams, workflows, worktrees, and async task orchestration. Evidence: 13.6K monthly downloads, 143 versions, rich unit/integration/smoke/bench scripts, and repo stats showing ~1,074 commits with latest push 2026-06-26. Lower GitHub stars than pi-subagents, but higher repo activity than most workflow-only alternatives. [NPM](https://www.npmjs.com/package/pi-crew) / [GitHub](https://github.com/baphuongna/pi-crew)
4. **@gotgenes/pi-subagents** — best subagent “core/API” candidate. It is a friendly fork of @tintinweb/pi-subagents, positioned as an in-process sub-agent core with typed API and lifecycle events other extensions can build on. Evidence: 17.6K monthly downloads, 135 versions, and monorepo stats of 59 stars, 20 forks, ~3,506 commits, latest push 2026-06-26. Prefer this over nicobailon/pi-subagents when extension composability and lifecycle events matter more than turnkey delegation UX. [NPM](https://www.npmjs.com/package/@gotgenes/pi-subagents) / [GitHub](https://github.com/gotgenes/pi-packages)
5. **@tintinweb/pi-subagents** — credible alternate autonomous subagent implementation. It advertises Claude Code-style autonomous sub-agents, includes demo media, build/lint/typecheck/test/e2e scripts, and has 29.8K monthly downloads with 40 versions. It appears mature enough to compare, but @gotgenes is explicitly a friendly fork with typed API/lifecycle positioning, while nicobailon has much broader adoption and session-sharing language. [NPM](https://www.npmjs.com/package/@tintinweb/pi-subagents) / [GitHub](https://github.com/tintinweb/pi-subagents)
6. **@juicesharp/rpiv-pi** — best structured skill/workflow stack rather than a raw orchestrator. It provides a skill-based development workflow, named subagents, and six `/wf` workflows chaining phases such as discover, research, design, plan, implement, validate, code-review, and commit. Evidence: 9,276 monthly downloads, 109 versions, and its repo monorepo has 432 stars, 57 forks, ~1,075 commits. [NPM](https://www.npmjs.com/package/@juicesharp/rpiv-pi) / [GitHub](https://github.com/juicesharp/rpiv-mono)
7. **@ayulab/pi-rewind** — focused checkpoint/navigation add-on for rabbithole control. It provides `/rewind` checkpoint navigation and has 29.6K monthly downloads, 22 versions, and latest modified 2026-06-24. It is not an orchestrator; use it alongside pi-subagents/pi-crew/dynamic-workflows to recover from bad branches. [NPM](https://www.npmjs.com/package/@ayulab/pi-rewind) / [GitHub](https://github.com/ayu-exorcist/oh-my-pi)
8. **context-mode** — best context/session compaction layer, not primarily an orchestrator. It advertises 98% context savings, sandboxed code execution, FTS5 knowledge base, intent-driven search, session extract/snapshot/db hooks, and very high adoption: 105.2K monthly downloads, 222 versions, repo 18,224 stars, 1,280 forks, ~2,049 commits, latest push 2026-06-26. Strong support layer for long multi-session work. [NPM](https://www.npmjs.com/package/context-mode) / [GitHub](https://github.com/mksglu/context-mode)
9. **pi-hermes-memory** — best Pi-native persistent memory/session search package. It explicitly includes persistent memory, session search, SQLite FTS5, auto-consolidation, skills, and secret scanning; evidence: 14K monthly downloads, 47 versions, 368 tests claimed in description, repo 164 stars, 37 forks, ~160 commits. Useful for rabbithole recovery and cross-session continuity. [NPM](https://www.npmjs.com/package/pi-hermes-memory) / [GitHub](https://github.com/chandra447/pi-hermes-memory)
10. **Session niche tools: pi-session-move / pi-session-graph / pi-invisible-continue** — promising but small. GitHub stats identify pi-session-move as active (~87 commits, latest 2026-06-26), pi-session-graph as session lineage graph tools (~138 commits), and pi-invisible-continue as invisible session continuation/resume (6 stars, ~21 commits). Treat as experimental add-ons until package docs and adoption are verified. [pi-session-move](https://github.com/ProbabilityEngineer/pi-session-move) / [pi-session-graph](https://github.com/ProbabilityEngineer/pi-session-graph) / [pi-invisible-continue](https://github.com/monotykamary/pi-invisible-continue)

## Comparison: overlapping subagent/workflow packages

| Package | Main role | Strengths | Weaknesses / risks | Best fit |
|---|---|---|---|---|
| pi-subagents | Turnkey delegation | Highest subagent adoption; parallel/chained tasks; TUI clarification; artifacts/session sharing | May overlap with workflow suites; details beyond artifact not fetched | Default subagent package |
| @quintinshaw/pi-dynamic-workflows | Large dynamic fanout | Resume, worktrees, model routing, cost accounting, deep research | Newer/smaller repo; 72 commits | Complex multi-agent workflows and research fanout |
| pi-crew | AI teams/worktrees/orchestration | Worktrees + async task orchestration; high repo activity; many tests/scripts | Lower GitHub stars; repo description in stats is null | Team-style coding tasks with isolated worktrees |
| @gotgenes/pi-subagents | Subagent core/API | Typed API and lifecycle events; active monorepo | Fork lineage may diverge; lower direct adoption | Building other extensions on subagents |
| @tintinweb/pi-subagents | Autonomous subagents | E2E tests, demo media, standalone alternate | Less adoption than nicobailon; gotgenes fork may supersede for API use | Independent Claude-style subagents |
| @juicesharp/rpiv-pi | Skill workflow suite | Contract-carrying skills, named subagents, `/wf` workflows | More process/skills than orchestration engine | Structured SDLC workflow discipline |
| pi-task / pi-taskflow / workflow-suite | Task graph/spec orchestration | pi-task: deterministic spec orchestration + worker subagents; pi-taskflow: DAG, gates, isolated subagent context, resumable runs | Less adoption than top three; some are new/small | Evaluate if DAG/static verification is desired |

## Practical stack recommendations

1. **General multi-session/rabbithole stack:** `pi-subagents` + `@ayulab/pi-rewind` + `pi-hermes-memory` or `context-mode`.
2. **Heavy fanout/research stack:** `@quintinshaw/pi-dynamic-workflows` + `pi-web-access` for search/fetch + `context-mode` for compression/session persistence.
3. **Coding implementation swarm:** `pi-crew` for worktree-backed team orchestration + `cc-safety-net` or a permission package for destructive-command guardrails.
4. **Structured SDLC:** `@juicesharp/rpiv-pi` if the desired behavior is named workflow phases and repeatable skills rather than free-form multi-agent fanout.

## Browser / web automation notes

- **pi-web-access** is coordination-adjacent: it gives web search, URL fetching, GitHub repo cloning, PDF extraction, YouTube/video understanding, and supports multiple providers; useful for research subagents but not itself a session manager. Evidence: 118.3K monthly downloads and repo 705 stars. [NPM](https://www.npmjs.com/package/pi-web-access)
- **pi-agent-browser-native** exposes agent-browser as a native Pi tool for browser automation; useful when workflow agents need browser state, web apps, or visual evidence, but it should not be the core multi-session orchestrator. Evidence: 11.4K monthly downloads and active package scripts for platform smoke tests. [NPM](https://www.npmjs.com/package/pi-agent-browser-native)

## Sources
- Kept: `/tmp/pi_candidates_enriched.json` — primary local NPM/package artifact containing names, descriptions, downloads, versions, manifests, scripts, keywords, and repo URLs.
- Kept: `/tmp/pi_candidate_gh_stats.json` — primary local GitHub artifact containing stars, forks, issues, created/updated/pushed dates, commit estimates, and repository descriptions.
- Kept: package/repo URLs listed inline — canonical external identifiers for follow-up verification.
- Dropped: SEO/commentary sources — no external web commentary was used; local artifacts had enough package and repo metadata for the requested shortlist.
- Dropped: pure review/context/security packages without clear coordination value, except where they support session recovery or long-running workflows.

## Gaps
- No package installation or live README/source inspection was performed, per instruction not to install packages and due this run relying on local artifacts. Before adopting, fetch README/API docs for the top 3 and verify actual Pi commands, isolation semantics, failure recovery, and permissions.
- Download counts in the local artifact may reflect npm data at collection time and should be refreshed before making a final production choice.
- “No staged files” could not be verified with `git status` because this subagent only had file read/write tooling, not shell execution.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Researched only Pi packages/extensions for multi-session/rabbithole management from the two requested local artifacts; wrote the requested brief to the authoritative output path."
    }
  ],
  "changedFiles": [
    "/Users/pschuermann/repos/browser/pi-ext-research/multisession.md",
    "/Users/pschuermann/.pi/agent/sessions/--Users-pschuermann-repos-browser--/subagent-artifacts/progress/a3ebc775/progress.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [],
  "validationOutput": [
    "Read /tmp/pi_candidates_enriched.json and /tmp/pi_candidate_gh_stats.json via file-read tool.",
    "Wrote final research brief to /Users/pschuermann/repos/browser/pi-ext-research/multisession.md."
  ],
  "residualRisks": [
    "No live npm/GitHub README fetch or package install was performed.",
    "No shell access was available to run git status; no-staged-files is based on no staging operations being performed by this subagent."
  ],
  "noStagedFiles": true,
  "diffSummary": "Added a focused markdown research brief comparing Pi multi-session/subagent/workflow/session-management packages and updated the required progress artifact.",
  "reviewFindings": [
    "no blockers"
  ],
  "manualNotes": "Top picks: pi-subagents, @quintinshaw/pi-dynamic-workflows, and pi-crew; pair with rewind/memory/context tooling for rabbithole recovery."
}
```