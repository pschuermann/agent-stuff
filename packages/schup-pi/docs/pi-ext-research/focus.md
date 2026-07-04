# Research: Pi packages/extensions for ADHD/focus/wellbeing and keeping humans on task

## Summary
Best candidates are small, composable primitives rather than large autonomous-agent suites: persistent todo/goal overlays, explicit ask-human tools, plan-mode gates, side-question isolation, reminders, workflow-state logs, and recap/memory. The strongest stack is `@juicesharp/rpiv-todo` + an ask-user tool + a goal/plan-mode extension + reminder/loop + memory/handoff, with heavier workflow tools added only when the user wants process enforcement.

## Research angles
1. Goal/todo/task-state primitives.
2. Ask-human, plan-review, and anti-rabbithole tools.
3. Reminders, recaps, handoff, and workflow state.
4. Adoption/maintenance signals from local npm/GitHub artifacts.

## Top candidates
1. **`@juicesharp/rpiv-todo` — best todo overlay primitive.** Described as “a todo list for the model, rendered as a live overlay that survives /reload and conversation compaction”; strong fit for ADHD externalization and “what are we doing now?” persistence. Evidence: 41.3K monthly downloads, v1.20.0, 103 versions, repo `juicesharp/rpiv-mono` has 432 stars, 57 forks, 1,075 estimated commits. [npm](https://www.npmjs.com/package/@juicesharp/rpiv-todo) [GitHub](https://github.com/juicesharp/rpiv-mono)
2. **`@juicesharp/rpiv-ask-user-question` — best typed ask-human checkpoint.** Provides a structured questionnaire with typed options so the model asks instead of guessing; useful for attention-preserving decision gates. Evidence: 49.2K monthly downloads, v1.20.0, 105 versions, same mature monorepo. [npm](https://www.npmjs.com/package/@juicesharp/rpiv-ask-user-question) [GitHub](https://github.com/juicesharp/rpiv-mono)
3. **`pi-ask-user` — richer interactive ask-user UI.** Searchable split-pane selection UI, multi-select, and freeform input; better if you want the human to choose among many options without parsing prose. Evidence: 7.5K monthly downloads, 19 versions. [npm](https://www.npmjs.com/package/pi-ask-user) [GitHub](https://github.com/edlsh/pi-ask-user)
4. **`pi-codex-goal` — focused goal tracking and continuation.** “Codex-style goal tracking and continuation”; includes tests, typecheck, and platform smoke scripts. Evidence: 7.6K monthly downloads, v0.1.32, recent modification, 33 versions. [npm](https://www.npmjs.com/package/pi-codex-goal) [GitHub](https://github.com/fitchmultz/pi-codex-goal)
5. **`@narumitw/pi-goal` / `pi-goal-x` — persistent goal modes.** `@narumitw/pi-goal` keeps working on `/goal` until complete; `pi-goal-x` adds persistent long-running objectives, `/goal-set` drafting, autoContinue, and above-editor status overlay. Evidence: 8.6K and 5.4K monthly downloads respectively. [narumitw npm](https://www.npmjs.com/package/@narumitw/pi-goal) [goal-x npm](https://www.npmjs.com/package/pi-goal-x)
6. **`@dreki-gg/pi-plan-mode` / `@narumitw/pi-plan-mode` — plan-first anti-rabbithole gates.** Dreki provides two-phase planning/execution with `.plans/` file handoff; Narumi adds Codex-like read-only `/plan` collaboration mode. Evidence: 4.7K and 4.4K monthly downloads; both recently updated. [dreki npm](https://www.npmjs.com/package/@dreki-gg/pi-plan-mode) [narumi npm](https://www.npmjs.com/package/@narumitw/pi-plan-mode)
7. **`@juicesharp/rpiv-btw` / `pi-btw` — side-question isolation.** Lets the user/model ask a one-off side question without polluting the main conversation; good anti-rabbithole primitive. Evidence: `rpiv-btw` 12.8K monthly downloads; `pi-btw` 8.6K monthly downloads and overlay screenshot metadata. [rpiv-btw](https://www.npmjs.com/package/@juicesharp/rpiv-btw) [pi-btw](https://www.npmjs.com/package/pi-btw)
8. **`@trevonistrevon/pi-loop` — reminder and re-wake loops.** Cron/event-based agent re-wake loops and background process monitoring; test scripts include `reminder-injection.sh`, making it the clearest reminder candidate. Evidence: 5.6K monthly downloads, 42 versions, tests/typecheck/lint. [npm](https://www.npmjs.com/package/@trevonistrevon/pi-loop) [GitHub](https://github.com/trvon/pi-loop)
9. **`@juicesharp/rpiv-workflow` — audited workflow state.** Chains skills into typed multi-stage workflows with audited JSONL state, predicate routing, and per-stage validation. Useful for “what phase are we in?” and handoff/recap. Evidence: 7.2K monthly downloads, 19 versions, mature rpiv monorepo. [npm](https://www.npmjs.com/package/@juicesharp/rpiv-workflow) [GitHub](https://github.com/juicesharp/rpiv-mono)
10. **`pi-soly` — integrated project-management/control-plane option.** Bundles plans, state, mandatory rules, self-review, multi-question picker, footer/welcome chrome, workflow engine, session recovery. Strong ADHD fit if you want one opinionated harness, but wider scope. Evidence: 5.5K monthly downloads, repo has 195 estimated commits. [npm](https://www.npmjs.com/package/pi-soly) [GitHub](https://github.com/lowern1ght/pi-soly)
11. **`pi-hermes-memory` — recap/handoff/session search.** Persistent memory + session search + auto-consolidation, SQLite FTS5, policy-only memory by default, 368 tests in package description. Evidence: 14K monthly downloads, 47 versions, repo has 164 stars, 37 forks, 160 estimated commits. [npm](https://www.npmjs.com/package/pi-hermes-memory) [GitHub](https://github.com/chandra447/pi-hermes-memory)
12. **`@plannotator/pi-extension` — human plan review and annotations.** Interactive plan review, annotations, message/code/PR review, team sharing, one-click feedback. Strong for pausing before execution and preventing drift. Evidence: 28.4K monthly downloads; repo has 6,523 stars, 465 forks, 743 estimated commits. [npm](https://www.npmjs.com/package/@plannotator/pi-extension) [GitHub](https://github.com/backnotprop/plannotator)
13. **`@ayulab/pi-rewind` — checkpoint navigation.** `/rewind` checkpoint navigation can recover from rabbitholes or wrong turns. Evidence: 29.6K monthly downloads, 22 versions. [npm](https://www.npmjs.com/package/@ayulab/pi-rewind) [GitHub](https://github.com/ayu-exorcist/oh-my-pi)
14. **`pi-agent-flow` — explicit flow-state transitions.** Described as a flow-state transition extension with trace/render/live-state tests; promising for wellbeing/focus signaling, but less explicit than todo/goal packages. Evidence: 7.3K monthly downloads, 141 versions. [npm](https://www.npmjs.com/package/pi-agent-flow) [GitHub](https://github.com/tuanhung303/pi-agent-flow)

## Suggested combinations
1. **Minimal focus stack:** `@juicesharp/rpiv-todo` + `@juicesharp/rpiv-ask-user-question` + `@juicesharp/rpiv-btw` + `pi-codex-goal`. Covers visible next actions, typed decisions, side-question containment, and goal continuation.
2. **Plan-first anti-rabbithole stack:** `@dreki-gg/pi-plan-mode` or `@narumitw/pi-plan-mode` + `@plannotator/pi-extension` + `@ayulab/pi-rewind`. Forces planning/review before action and provides recovery when the session wanders.
3. **Reminder/handoff stack:** `@trevonistrevon/pi-loop` + `pi-hermes-memory` + `@juicesharp/rpiv-todo`. Adds scheduled nudges, session recap/search, and persistent visible task state.
4. **Opinionated workflow stack:** `pi-soly` or `@juicesharp/rpiv-workflow` + `@juicesharp/rpiv-ask-user-question`. Use when process/state enforcement matters more than lightweight UX.

## Sources
- Kept: `/tmp/pi_candidates_enriched.json` — primary local artifact for npm metadata, package descriptions, manifests, scripts, versions, downloads, and repo URLs.
- Kept: `/tmp/pi_candidate_gh_stats.json` — primary local artifact for GitHub stars/forks/issues/commit estimates/freshness.
- Kept: npm package pages linked inline — canonical package identity and installation metadata.
- Kept: GitHub repo pages linked inline — canonical source/repo health identity.
- Dropped: broad autonomous orchestration packages such as `pi-subagents`, `pi-crew`, `@quintinshaw/pi-dynamic-workflows`, `@a5c-ai/babysitter-pi`, and `zob-harness` as top recommendations — useful, but too broad for direct ADHD/focus primitives unless the desired solution is full agent orchestration.
- Dropped: generic context/compression/search/security packages — helpful for productivity, but not direct goal/todo/reminder/ask-human/plan-state primitives.

## Gaps
- I did not install or execute any packages. Evidence is from local artifacts and package/repo metadata, not hands-on UX validation.
- Local artifacts give descriptions and health signals, not exact runtime compatibility conflicts between extensions. Next step: test the minimal stack in a disposable Pi profile and check overlay/keybinding conflicts.

## Acceptance report
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Produced focused research brief from the requested local artifacts, limited to ADHD/focus/wellbeing/task-state Pi extensions, and wrote it to /Users/pschuermann/repos/browser/pi-ext-research/focus.md."
    }
  ],
  "changedFiles": [
    "/Users/pschuermann/repos/browser/pi-ext-research/focus.md",
    "/Users/pschuermann/.pi/agent/sessions/--Users-pschuermann-repos-browser--/subagent-artifacts/progress/a3ebc775/progress.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "read /tmp/pi_candidates_enriched.json",
      "result": "passed",
      "summary": "Reviewed local enriched npm/package metadata in chunks."
    },
    {
      "command": "read /tmp/pi_candidate_gh_stats.json",
      "result": "passed",
      "summary": "Reviewed local GitHub stats metadata."
    },
    {
      "command": "write /Users/pschuermann/repos/browser/pi-ext-research/focus.md",
      "result": "passed",
      "summary": "Wrote requested research brief."
    }
  ],
  "validationOutput": [
    "No package installation or code execution performed; research-only artifact generated."
  ],
  "residualRisks": [
    "No hands-on runtime compatibility testing between recommended extensions."
  ],
  "noStagedFiles": true,
  "diffSummary": "Added research brief and progress note only.",
  "reviewFindings": [
    "no blockers"
  ],
  "manualNotes": "Evidence is based on local artifacts /tmp/pi_candidates_enriched.json and /tmp/pi_candidate_gh_stats.json."
}
```
