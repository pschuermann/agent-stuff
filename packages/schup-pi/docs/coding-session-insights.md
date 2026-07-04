# Coding Session Insights Research And Bakeoff

This is the working design for a Pi/Codex equivalent of Claude Code's `/insights`: read local coding-agent session logs, identify repeated patterns, and produce advice that can improve both the agent setup and the human workflow.

The first rule is that insights must be earned from session evidence. A useful report should cite behavior in real logs, distinguish recurring patterns from one-off incidents, and avoid generic "use clearer prompts" advice unless the logs show that this would have changed the outcome.

## Current Evidence

Claude Code appears to have a built-in `/insights` command, but the strongest public sources I found are not official implementation docs. Several posts describe it as reading local Claude Code transcripts from the last 30 days and generating an HTML report under `~/.claude/usage-data/report.html`, but those posts are not enough to copy the approach. Anthropic's official material is stronger for the adjacent telemetry layer: Claude Code documents OpenTelemetry export for usage, cost, tool activity, logs, events, and traces. That supports the idea that serious session analysis should use structured tool/model/session evidence, not only conversational summaries.

For evaluation, the better sources are the usual eval literature and tooling rather than social posts. OpenAI Evals and Braintrust both frame evals as controlled inputs plus reproducible scoring. Braintrust's LLM-as-judge guidance is relevant because the desired output is qualitative advice, but it also means we need a rubric and spot human review because model judges have error rates. G-Eval is relevant as a rubric/form-filling pattern for judging natural language outputs, with the known caveat that LLM judges can be biased toward LLM-like answers.

## Candidate Tools Checked

These numbers were checked from GitHub and npm on 2026-07-04 NZ time.

| Tool | What it is | GitHub | npm last month | Fit |
|---|---|---:|---:|---|
| `codeburn` | Local usage/cost analytics across many AI coding tools, including Claude Code and Codex | 8,423 stars / 662 forks | 25,211 | Strong usage baseline, weak coaching layer |
| `vibe-log-cli` | Logs and analyzes Claude Code and Cursor AI coding sessions | 335 stars / 21 forks | 572 | Worth inspecting for logging/report format ideas |
| `@code-insights/cli` | Turns AI coding sessions into knowledge | 64 stars / 14 forks | 238 | Conceptually close, but small adoption |
| `codex-session-insights` | Generates a report analyzing Codex sessions | 15 stars / 1 fork | 113 | Useful comparison target for Codex logs, not a production bet |
| `claude-insights` | Parses Claude Code `/insight` reports and generates rules/skills/settings | 13 stars / 0 forks | 179 | Interesting second-stage idea, but depends on Claude's report |
| `atani/codex-insights` | Codex CLI session analyzer with HTML usage reports and AI suggestions | 5 stars / 3 forks | not checked as npm | Too small to anchor on |

The result is clear enough: do not clone one of these wholesale. `codeburn` is the only high-adoption project in the group, but it is mainly telemetry and cost accounting. The coaching problem needs a local bakeoff over our own logs.

## Bakeoff Shape

The bakeoff should compare prompt approaches on identical session packets. Each packet should include normalized evidence from Pi and Codex logs:

- session id, source, cwd, start time
- first and latest user prompts
- user turn count and assistant message count
- tool calls, failed tool results, edit calls, verification commands, git inspection, web search
- short command and error snippets
- token/cost totals when available

The first implemented prompt variants are:

- `claude-style`: concise retrospective with patterns and improvements.
- `evidence-coach`: evidence-first findings with confidence, separate advice for agent and human, and a next-5-session experiment.
- `eval-rubric`: scores process dimensions and proposes measurable experiments.
- `anti-slop`: explicitly filters unsupported or vague advice.

The judge rubric scores outputs on evidence grounding, specificity, human coaching, agent improvement, calibration, and recurrence value. The judge should not be the final authority. It is a fast filter to identify which prompt candidates deserve a human read.

## Current Implementation

`session-insights.mjs` is the local utility:

```sh
node session-insights.mjs summary --days 30 --limit 12 --source all
node session-insights.mjs prompt --prompt evidence-coach --days 30 --limit 12 --source all
node session-insights.mjs harness --file ~/.pi/agent/sessions/.../session.jsonl
node session-insights.mjs eval-pack --days 30 --limit 12 --source all
node session-insights.mjs report --days 30 --limit 4 --source all --model openai-codex/gpt-5.4-mini
node session-insights.mjs run-bakeoff --days 30 --limit 1 --source all --cwd /Users/pschuermann/repos/agent-stuff --model openai-codex/gpt-5.4-mini --judge-model openai-codex/gpt-5.5
```

The Pi extension adds:

```text
/insights
/insights harness
/insights harness --file /Users/pschuermann/.pi/agent/sessions/.../session.jsonl
/insights summary --days 14 --limit 8
/insights prompt --prompt anti-slop --source codex
/insights eval-pack --source all
/insights report --limit 4 --model openai-codex/gpt-5.4-mini
/insights run-bakeoff --limit 1 --model openai-codex/gpt-5.4-mini --judge-model openai-codex/gpt-5.5
```

By default, `/insights` filters to the current working directory and submits an `evidence-coach` packet back into the active Pi session. That default prompt now groups output into human coaching, agent/harness improvements, and workflow experiments. `/insights harness` is the focused mode for patchable AGENTS.md, skill, prompt-mode, hook, extension, and helper-script recommendations. `--file` analyzes an exact Pi or Codex JSONL session without relying on cwd/limit selection. `summary`, `prompts`, `eval-pack`, `report`, and `run-bakeoff` display output without triggering a turn.

The utility redacts common API keys, bearer tokens, GitHub tokens, Slack tokens, AWS access key ids, and `*_TOKEN` / `*_SECRET` / `*_PASSWORD` style environment assignments before rendering model-facing packets. Bakeoff artifacts are written under `.pi/insights-bakeoffs/`, and generated HTML reports are written under `.pi/insights-reports/`. Both paths are ignored by git and should be treated as local evidence rather than package content.

Empty scopes are terminal. If a scoped `/insights` run finds no useful sessions, it emits a clear "No useful sessions found" packet and does not trigger an agent turn. The Pi command's automatic cwd filter passes `--fallback-global`, so a brand-new repo widens to recent global sessions with an explicit note instead of producing recommendations from an empty packet.

## Claude Code-style Report Implementation

`docs/claude-code-insights-spec.md` describes the inspected Claude Code implementation as a multi-stage system: local metadata scan, optional LLM facet extraction, aggregate metrics, multiple narrative insight sections, and a self-contained HTML report.

The implemented compatible path is deliberately local and Pi/Codex-aware:

- It reuses the redacted Pi/Codex session packet instead of Claude's `~/.claude/projects` logs.
- It adds a `claude-code-report` prompt candidate modeled on the spec sections: At a Glance, What You Work On, How You Use The Agent, What Worked, Friction, Suggested Instructions, Existing Features, On The Horizon, and Memorable Moment.
- It adds `node session-insights.mjs report`, which runs the spec-style report prompt through `llm`, writes `report.md`, and renders a self-contained escaped `report.html`.
- It does not remove or replace `evidence-coach`; the spec-style report is a second approach for shareable/product-style reporting.

The generated report from the broader sample is:

```text
.pi/insights-reports/2026-07-03T21-46-28-963Z/report.html
```

## Bakeoff Results

The first Codex-backed pilot used `openai-codex/gpt-5.4-mini` through `llm-openai-via-codex`, with one recent Codex session and one recent Pi session from this repo. Artifacts were written to:

```text
.pi/insights-bakeoffs/2026-07-03T21-14-33-189Z/
```

All four variants completed. The judge picked `evidence-coach`:

| Variant | Overall | Read |
|---|---:|---|
| `evidence-coach` | 5 | Best grounded, most actionable, explicit uncertainty |
| `anti-slop` | 4 | Strong calibration and useful as a guardrail |
| `eval-rubric` | 4 | Good scorecard, weaker human coaching |
| `claude-style` | 3 | Clear, but too generic compared with the others |

The best recurring idea was that the sessions showed "exploration without closure": broad search and explanation, but little verification or durable artifact extraction. That is worth encoding into the default insight prompt: require claim-to-evidence links, one next verification step, and separate agent/tooling changes from human coaching.

A wider run used four recent Pi sessions and four recent Codex sessions across multiple repos:

```text
.pi/insights-bakeoffs/2026-07-03T21-20-01-748Z/
```

That run also picked `evidence-coach`:

| Variant | Overall | Read |
|---|---:|---|
| `evidence-coach` | 5 | Strongest concrete session evidence and most useful workflow changes |
| `eval-rubric` | 4 | Careful and experiment-oriented, but less directly tailored |
| `claude-style` | 3 | Clear but more generic |
| `anti-slop` | 3 | Good calibration, weaker improvement plan |

The wider run added five useful default checks:

- preflight packages, keys, helper files, and runtime assumptions before using brittle tools
- stop and summarize after initial exploration
- require at least one task-specific verification step before claiming completion
- use a commit workflow checklist for grouped commits and pushes
- restate the current goal and constraints after user scope shifts

After implementing the Claude Code-style report path, a new bakeoff compared five candidates over the same broader sample:

```text
.pi/insights-bakeoffs/2026-07-03T21-47-10-797Z/
```

That run still picked `evidence-coach`, but `claude-code-report` was competitive:

| Variant | Overall | Read |
|---|---:|---|
| `evidence-coach` | 5 | Best evidence discipline, strongest human/agent coaching, most testable next steps |
| `claude-code-report` | 4 | Better shareable report shape, strong agent/tooling suggestions, slightly less calibrated |
| `claude-style` | 4 | Practical but more summary-heavy |
| `eval-rubric` | 4 | Useful structure, less directly coaching-oriented |
| `anti-slop` | 4 | Strong overclaiming filter, less useful as the main report |

Conclusion: keep `evidence-coach` as the default `/insights` prompt for actionable coaching. Use `report` / `claude-code-report` when the desired output is a shareable HTML-style retrospective with productized sections.

## Next Bakeoff Step

Run the same bakeoff periodically as more sessions accumulate, especially after prompt or extension changes. The best prompt is the one whose advice changes what we would do in the next five sessions, not the one that sounds most polished.

The first acceptance bar:

- At least one finding cites a real repeated behavior across multiple sessions.
- Human coaching is concrete and not blamey.
- Agent advice maps to a prompt, extension, skill, or command change.
- The report says when evidence is too thin.
- The output is shorter than the logs by enough to be worth reading.

## Sources

- Anthropic Claude Code repository: https://github.com/anthropics/claude-code
- Claude Code monitoring docs: https://code.claude.com/docs/en/monitoring-usage
- Claude Code Agent SDK observability docs: https://code.claude.com/docs/en/agent-sdk/observability
- Anthropic "How Anthropic teams use Claude Code" PDF: https://www-cdn.anthropic.com/58284b19e702b49db9302d5b6f135ad8871e7658.pdf
- OpenAI Evals repository: https://github.com/openai/evals
- OpenAI evals guide: https://developers.openai.com/api/docs/guides/evals
- Braintrust LLM-as-judge overview: https://www.braintrust.dev/articles/what-is-llm-as-a-judge
- Braintrust evaluation docs: https://www.braintrust.dev/docs/evaluate
- G-Eval paper: https://aclanthology.org/2023.emnlp-main.153/
- `codeburn`: https://github.com/getagentseal/codeburn
- `vibe-log-cli`: https://github.com/vibe-log/vibe-log-cli
- `@code-insights/cli`: https://github.com/melagiri/code-insights
- `codex-session-insights`: https://github.com/cosformula/codex-session-insights
- `claude-insights`: https://github.com/yahav10/claude-insights
- `atani/codex-insights`: https://github.com/atani/codex-insights
