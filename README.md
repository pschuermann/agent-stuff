# Agent Stuff

Fork of Armin's personal [Pi Coding Agent](https://buildwithpi.ai/) package repo.

The root package is still [`mitsupi`](https://www.npmjs.com/package/mitsupi): Armin's reusable Pi extensions, skills, prompt commands, themes, and supporting utilities. This fork keeps small local patches to `mitsupi` in place, but Pirmin-specific additions live in local packages under [`packages`](packages) so upstream refreshes stay lower-conflict.

## Packages in this repo

- [`mitsupi`](package.json) — root package. Treat this as upstream-owned, except for deliberate local patches.
- [`packages/schup-pi`](packages/schup-pi) — personal Pi package for local extensions, skills, and helper scripts. Commands intentionally keep natural names rather than a `schup-` prefix.
- [`packages/pi-sci`](packages/pi-sci) — auditable research workflow package with `/sci-*` prompt templates and research skills.

## Root `mitsupi` resources

The root Pi manifest exports:

- [`extensions`](extensions) as Pi extensions
- [`skills`](skills) as agent skills
- [`themes`](themes) as Pi themes
- [`commands`](commands) as prompt commands

Prompt commands:

- [`/discuss`](commands/discuss.md) — planning interviewer mode.

Root skills currently include Armin/upstream-oriented skills such as `commit`, `frontend-design`, `github`, `google-workspace`, `librarian`, `native-web-search`, `pi-share`, `summarize`, `tmux`, `update-changelog`, `uv`, `web-browser`, plus travel/CAD/Sentry/Ghidra helpers.

Root extensions currently include `answer`, `btw`, `control`, `files`, `goal`, `multi-edit`, `no-sleep`, `notify`, `prompt-editor`, `review`, `session-breakdown`, `split-fork`, `todos`, `trust-github-repos`, `uv`, and `whimsical`.

## Local installation

Pi user settings should load packages rather than direct root extension paths:

```json
{
  "packages": [
    "/Users/pschuermann/repos/agent-stuff",
    "/Users/pschuermann/repos/agent-stuff/packages/schup-pi",
    "/Users/pschuermann/repos/agent-stuff/packages/pi-sci"
  ]
}
```

Claude Code still needs skills exposed separately. Use symlinks from `~/.claude/skills` to the desired skill directories in either root `skills/`, `packages/schup-pi/skills/`, or `packages/pi-sci/skills/`.

The root extensions also include:

- [`continue.ts`](extensions/continue.ts), where `shift+option+enter` sends `continue` only when the agent is stopped.
- [`subagent.ts`](extensions/subagent.ts), a serial tmux-backed `subagent` tool for observable child Pi sessions.

## Development

Install root dependencies with npm:

```sh
npm install
```

Release notes for the root package are in [`CHANGELOG.md`](CHANGELOG.md). Pi loads TypeScript extensions directly from the paths declared in each package manifest.
