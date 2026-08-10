# schup-pi

Personal Pi package for Pirmin Schuermann's extensions, skills, and helper scripts.

This package intentionally uses natural command names rather than a `schup-` command prefix. If a command collides with `mitsupi`, either patch/filter the `mitsupi` command or accept Pi's numeric suffixes for duplicate extension commands.

## Install locally

```sh
pi install /Users/pschuermann/repos/agent-stuff/packages/schup-pi
```

For local development from this repo, keep the package path in Pi settings rather than copying files into `~/.pi/agent`.

## Claude Code skill access

Claude Code does not consume Pi packages directly. Keep using symlinks into `~/.claude/skills`, but point schup-owned skills at:

```text
/Users/pschuermann/repos/agent-stuff/packages/schup-pi/skills/<skill-name>
```

Root `mitsupi` skills that you still want in Claude Code can continue to be symlinked from:

```text
/Users/pschuermann/repos/agent-stuff/skills/<skill-name>
```

## Dependency note

Some skills include helper scripts with Node/Python dependencies. For this local package, dependencies are declared in the package root so scripts can resolve modules from `packages/schup-pi/node_modules` after `npm install` in this directory.

## Model-and-effort stacks

`extensions/stacks.ts` cycles model-and-effort tuples from `~/.pi/agent/stacks.json` without changing editor text. Run `/stacks init` to preview and create a starter file from models that are scoped and authenticated on the current machine, or configure only provider, model, and effort manually:

```json
{
  "stacks": [
    { "provider": "anthropic", "model": "claude-sonnet-4-5", "effort": "medium" },
    { "provider": "openai", "model": "gpt-5", "effort": "high" }
  ]
}
```

- `Ctrl+]` selects the next tuple; `Ctrl+[` selects the previous one. Both directions wrap; `Ctrl+P` remains Pi's native model cycling, while `Ctrl+L` opens the model selector.
- The extension rereads and validates this file on every shortcut, so saved edits take effect without `/reload`.
- `/stacks` lists the configured tuples, flags unusable entries, and shows authenticated scoped models that are not represented.
- `/stacks init` never overwrites an existing file. Its starter ladder conditionally recognizes DeepSeek V4 Flash; GPT-5.6 Luna, Terra, and Sol; and Claude Opus 5 and Fable 5. Unavailable models are omitted, direct subscription providers are preferred to OpenRouter, and pinned scoped efforts are respected.

### Refreshing the list

Keep the list small and order model-and-effort tuples from fast or economical routine work to the strongest escalation option. Treat benchmark results as evidence tied to a particular task, harness, effort, price, and date rather than as a universal ranking. When models change, use this prompt in Pi:

> Review my Pi model-and-effort stacks for this machine. Read `~/.pi/agent/stacks.json`, inspect the current scoped models and authenticated providers, and identify scoped models that are missing or configured models that are no longer usable. Research relevant new models and effort levels using the `artificial-analysis` skill, official provider documentation, and applicable coding-agent benchmarks. Keep different benchmark methodologies and provider claims separate. Propose roughly 5–9 exact provider/model/effort tuples ordered from fast or economical routine work to strongest escalation, using my existing configuration as a prior rather than a permanent allowlist. Include only models scoped and authenticated on this machine. Explain additions, removals, effort choices, evidence gaps, and ordering; show the proposed JSON diff and ask before editing.

The initializer currently prefers these effort points when they are available and not overridden by a scoped effort pin: DeepSeek V4 Flash `high`; GPT-5.6 Luna `medium`, `high`, and `xhigh`; Terra `low` and `high`; Opus 5 `high`; Fable 5 `high`; and Sol `medium`. Revise this guidance when newer evidence or local experience warrants it.
