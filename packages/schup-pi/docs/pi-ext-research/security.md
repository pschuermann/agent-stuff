# Research: Pi SECURITY/SAFETY packages/extensions

## Summary
Pi extensions execute with the user’s local agent privileges, so the most relevant candidates are those that gate tool execution, constrain filesystem/process access, or reduce accidental secret exposure. Based on the local npm/GitHub artifacts only, the strongest short list is: `@aliou/pi-guardrails`, `@gotgenes/pi-permission-system`, `pi-landstrip`, `cc-safety-net`, `pi-hermes-memory`, and `latchkey`; use extra caution with browser/MCP/remote-control extensions because they expand the agent’s reach rather than constraining it.

## Findings
1. **Best general guardrails: `@aliou/pi-guardrails`** — Explicitly security-focused and splits control across path access, guardrails, and permission-gate extensions (`./extensions/path-access/index.ts`, `./extensions/guardrails/index.ts`, `./extensions/permission-gate/index.ts`). It has 5,259 monthly downloads, 42 versions, active modification on 2026-06-26, test/typecheck/schema-check scripts, and GitHub stats of 190 stars, 26 forks, 166 estimated commits. **Red flags:** still a full-privilege extension; local artifact description was mostly a banner so behavioral detail comes from keywords/manifest/repo description rather than verified source review. [npm](https://www.npmjs.com/package/@aliou/pi-guardrails) [repo](https://github.com/aliou/pi-guardrails)
2. **Best explicit policy/authorization candidate: `@gotgenes/pi-permission-system`** — Described as “Permission enforcement extension for the Pi coding agent” with keywords for permissions, policy, access-control, authorization, and security. It has 19,670 monthly downloads, 133 versions, active modification on 2026-06-26, and a test/typecheck/lint script set; the monorepo has 59 stars, 20 forks, and 3,506 estimated commits. **Red flags:** high churn and monorepo packaging make it important to audit the exact package subdirectory and release contents before trusting it. [npm](https://www.npmjs.com/package/@gotgenes/pi-permission-system) [repo](https://github.com/gotgenes/pi-packages)
3. **Best OS-level sandbox direction: `pi-landstrip`** — Described as “Landlock-based sandboxing for pi with interactive permission prompts,” with security category, 9,109 monthly downloads, 61 versions, active modification on 2026-06-26, and CI scripts for fmt/lint/typecheck. **Red flags:** Landlock implies Linux-specific OS semantics; GitHub footprint is small (4 stars, 2 forks, 144 estimated commits), so verify platform support, bypass boundaries, and fallback behavior before relying on it. [npm](https://www.npmjs.com/package/pi-landstrip) [repo](https://github.com/landstrip/pi-landstrip)
4. **Best destructive-command safety net: `cc-safety-net`** — Described as a coding-agent hook that blocks destructive git/filesystem commands before execution; repo description says it supports Codex, Claude Code, OpenCode, Gemini CLI, Copilot CLI, Kimi Code, and Pi. It has 7,714 monthly downloads, strong repo stats (1,421 stars, 65 forks, 644 estimated commits), and robust checks (`lint`, `typecheck`, `knip`, `ast-grep`, tests with coverage). **Red flags:** command filters can miss indirect destructive behavior or cause false positives; `prepare`/hook setup scripts deserve review because install-time/hook behavior is sensitive. [npm](https://www.npmjs.com/package/cc-safety-net) [repo](https://github.com/kenryu42/cc-safety-net)
5. **Memory with secret-scanning guardrails: `pi-hermes-memory`** — Security-relevant because it combines persistent memory/session search with “secret scanning,” “policy-only memory by default,” “context fencing,” and “two-tier-memory.” It has 13,954 monthly downloads, 47 versions, active modification on 2026-06-25, and repo stats of 164 stars, 37 forks, 160 estimated commits. **Red flags:** persistent memory is inherently sensitive; confirm where SQLite data lives, whether secrets are actually blocked before persistence, and whether exported/searchable session data can leak credentials. [npm](https://www.npmjs.com/package/pi-hermes-memory) [repo](https://github.com/chandra447/pi-hermes-memory)
6. **Credential-specific tool worth separate review: `latchkey`** — A CLI/skills package that “injects API credentials into curl requests to third-party services,” with 11,828 monthly downloads, 55 versions, and repo link to Imbue AI. **Red flags:** it directly handles API credentials; because the artifact lists skills but no Pi extension, it may be narrower than full agent hooks, but the threat model is credential exfiltration via command construction, logging, shell history, and third-party endpoints. [npm](https://www.npmjs.com/package/latchkey) [repo](https://github.com/imbue-ai/latchkey)
7. **Secondary sandbox/policy candidates:** `pi-sandbox` offers “OS-level sandboxing for pi with interactive permission prompts” but has lower adoption (5,609 downloads, 16 versions) than `pi-landstrip`; `@amaster.ai/pi-security` advertises a “resource-aware security policy engine and tool authorization” but is young (0.1.3, 4,979 downloads) and lives in a broad monorepo with many powerful automation packages. [pi-sandbox](https://www.npmjs.com/package/pi-sandbox) [@amaster.ai/pi-security](https://www.npmjs.com/package/@amaster.ai/pi-security)
8. **High-risk extensions to treat as expansion of attack surface, not safety controls:** web, MCP, browser, remote-control, telemetry, and computer-use packages can expose network, credentials, browser sessions, or desktop automation. Notable examples from the artifact include `pi-web-access` (web search/fetch/GitHub clone/PDF/YouTube), `pi-mcp-adapter` and `pi-mcp-extension` (connect arbitrary MCP tools), `pi-chrome` (uses existing signed-in Chrome profile after authorization), `@ygncode/pi-web` (remote control from any browser on the network), `@amaster.ai/pi-computer-use` (desktop automation), and `@braintrust/pi-extension`/`@raindrop-ai/pi-agent`/`@amaster.ai/pi-telemetry` (session/tool tracing). These may be useful, but should be installed only with explicit trust and minimal secrets in scope. [pi-web-access](https://www.npmjs.com/package/pi-web-access) [pi-chrome](https://www.npmjs.com/package/pi-chrome)

## Ranked short list
1. `@aliou/pi-guardrails` — best Pi-native guardrail bundle candidate.
2. `@gotgenes/pi-permission-system` — best explicit permission/policy candidate.
3. `pi-landstrip` — best OS sandbox candidate if Linux/Landlock fits the environment.
4. `cc-safety-net` — best mature destructive-command backstop.
5. `pi-hermes-memory` — best memory package with stated secret-scanning controls; audit storage before use.
6. `latchkey` — useful for credential injection workflows, but requires a secrets-focused audit.

## Sources
- Kept: `/tmp/pi_candidates_enriched.json` — primary local artifact for npm package metadata, manifests, scripts, downloads, versions, keywords, and repo URLs.
- Kept: `/tmp/pi_candidate_gh_stats.json` — primary local artifact for GitHub stars/forks/issues/commit freshness.
- Kept: npm/repo URLs embedded in the artifacts — cited as identifiers for independent follow-up review.
- Dropped: packages with no clear security/safety function, duplicate wrappers, purely UI/theme/status packages, or packages whose main value is orchestration/context without concrete permission/sandbox/secrets controls.

## Gaps
- No package source code, npm tarballs, lockfiles, dependency trees, or security advisories were fetched or installed in this run.
- The available tool set did not include `web_search`, so this brief is artifact-based; independent review should inspect exact release tarballs, extension entrypoints, install scripts, dependency audit output, and any code paths that intercept shell/file/network/browser tools.
- Highest-priority next steps: review `@aliou/pi-guardrails`, `@gotgenes/pi-permission-system`, `pi-landstrip`, and `cc-safety-net` source for bypasses; test failure modes in a disposable repo; verify that guardrails cannot be disabled by another full-access extension.

## Supervisor coordination
No supervisor decision was needed.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Produced a security/safety-focused research brief from the specified local artifacts without installing packages or changing product code."
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "Each top candidate includes artifact-backed metadata, npm/repo URLs, evidence, and red flags for independent review."
    }
  ],
  "changedFiles": [
    "/Users/pschuermann/repos/browser/pi-ext-research/security.md",
    "/Users/pschuermann/.pi/agent/sessions/--Users-pschuermann-repos-browser--/subagent-artifacts/progress/a3ebc775/progress.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "read /tmp/pi_candidates_enriched.json",
      "result": "passed",
      "summary": "Reviewed candidate npm metadata, manifests, scripts, and package descriptions."
    },
    {
      "command": "read /tmp/pi_candidate_gh_stats.json",
      "result": "passed",
      "summary": "Reviewed GitHub stats for relevant repositories."
    },
    {
      "command": "write progress.md and security.md",
      "result": "passed",
      "summary": "Wrote progress update and final research brief to the requested paths."
    }
  ],
  "validationOutput": [
    "Final brief written to /Users/pschuermann/repos/browser/pi-ext-research/security.md.",
    "No packages were installed."
  ],
  "residualRisks": [
    "No web_search tool was available, so findings rely on local artifacts rather than live npm/GitHub source inspection.",
    "No git status tool was available; no staging commands were run."
  ],
  "noStagedFiles": true,
  "diffSummary": "Added artifact-based security/safety research brief and progress note only.",
  "reviewFindings": [
    "no blockers"
  ],
  "manualNotes": "Extensions have full local access; treat all recommended packages as requiring source/tarball audit before installation."
}
```
