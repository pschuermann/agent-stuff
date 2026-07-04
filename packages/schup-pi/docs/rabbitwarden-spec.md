# Rabbitwarden Spec

Status: draft  
Last updated: 2026-06-27

## PM cut: what to build now vs later

This spec currently contains many good ideas. The first product should be much narrower: **a local Resume Board for AI-agent work, exposed through the menu bar**.

The MVP should prove one thing:

> When I lose track of agent work, Rabbitwarden can show what sessions exist, where they belong, what branch/worktree they touched, and how to resume or close them.

Everything else should hang off that spine.

### Build now: MVP / v0

#### 1. Local session inventory

Collect sessions from the harnesses the user already uses most:

- pi
- Codex CLI/Desktop session files
- Claude Code

For every session, normalize:

- harness
- session ID
- log path
- cwd / repo root / worktree path
- branch / HEAD SHA where available
- started at / last activity
- first user prompt
- latest user prompt
- resume command

Do **not** use model/provider as a user-facing identifier.

Acceptance criteria:

- Opening Rabbitwarden shows recent pi/Codex/Claude sessions from the last 7–21 days.
- Each row answers: “what repo was this, what branch, what harness, and how do I resume it?”
- It correctly avoids calling a pi session “Codex” just because the model/provider was Codex.

#### 2. Menu bar Resume Board

Primary UI is a menu bar/tray item, not a full dashboard.

Minimum menu:

```text
Rabbitwarden
  Active / recent trails
    repo-a  branch-x  pi  12m idle
      Resume
      Copy resume command
      Reveal log
      Mark parked
    repo-b  main      codex  2h idle
      Resume
      Copy resume command
      Reveal log
      Mark closed
  Close-loop queue
  Dopamine check status
  Open local dashboard/debug view
```

Acceptance criteria:

- User can resume a session without remembering where it was stored.
- User can copy a resume command.
- User can see stale/idle sessions at a glance.

#### 3. Basic close-loop queue

Start with simple, deterministic signals:

- session idle for more than N minutes/hours
- associated repo/worktree is dirty
- branch differs from main/default
- untracked files exist

Queue actions:

- Resume
- Copy resume command
- Mark closed
- Park with note
- Ignore for today

Acceptance criteria:

- Rabbitwarden can say: “this repo has uncommitted agent work from session X.”
- User can park/close/dismiss without losing the link to the session.

#### 4. Minimal Dopamine Check

Build a very small version now because it is core to the product’s personality, but keep it rule-based.

Trigger only on obvious bursts, for example:

- more than 5 new sessions in 60 minutes
- more than 4 repos/worktrees touched in 60 minutes
- more than 3 dirty repos linked to recent sessions

Notification copy:

> Dopamine check: lots of new trails in the last hour. Still useful, or park some?

Actions:

- Still useful
- Park one
- Show trails
- Snooze

Acceptance criteria:

- It nudges rarely.
- It never blocks work.
- It feels like a gentle check, not judgement.

#### 5. Tiny idea/parking register

Only support parking a trail with a short note.

Store:

- title
- note
- source session
- repo/worktree/branch
- created time
- status: parked / active / closed

Do not build a rich idea-management system yet.

### Explicitly not now

Defer these until the Resume Board is useful:

- full dashboard / graph UI
- sophisticated thread inference
- LLM-generated summaries by default
- cross-machine sync
- cloud accounts
- Cursor collector
- Copilot collector
- Claude Desktop collector
- VS Code/Cursor extensions
- subagent lineage visualization
- automatic goal classification
- productivity scoring
- model/provider analytics
- blocking/enforcement modes
- advanced wellbeing coaching
- native mobile app

### Maybe never / be careful

Rabbitwarden should probably never become:

- a generic task manager
- a Jira replacement
- a time tracker focused on productivity metrics
- a model/provider analytics dashboard
- a tool that shames exploration
- a system that requires perfect manual bookkeeping

### v1 candidates after MVP works

Build these only after the user is actually using the Resume Board:

1. **Thread grouping**: group sessions into likely trails using repo, time, prompts, and parent metadata.
2. **Session summaries**: local/optional summaries for “what happened here?”
3. **Better close-loop workflow**: create TODO, write handoff note, commit/stash reminder.
4. **Dashboard timeline**: richer review of a day/week of trails.
5. **Agent harness integrations**: pi/Claude/Codex commands that can query Rabbitwarden.
6. **Cursor/Copilot collectors**: once the core collector abstraction is stable.
7. **Subagent lineage**: show spawned agents and fan-out.
8. **Wellbeing tuning**: better quiet hours, late-night mode, per-thread snoozing.

### Core product principle

If a feature does not help with one of these three jobs, it is probably not MVP:

1. **Recover**: What was I doing, where, and how do I resume it?
2. **Decide**: Is this trail active, parked, closed, or a rabbit hole?
3. **Close**: What work needs a summary, commit, stash, TODO, or abandonment?

## One-line idea

Rabbitwarden is a local menu bar / tray companion that watches AI-agent work sessions across harnesses and helps the user wander deliberately, manage rabbit holes, and close loops.

## Product stance

Rabbitwarden is not productivity police. It should protect curiosity and follow-through.

It should help answer:

- What work threads are active right now?
- Which agent/harness/session/repo are they in?
- Did this new trail branch off from another trail?
- Is this exploration still useful, or has it become stimulation without value?
- What work has been left half-open and needs closure?
- How can Future Me resume or understand this session?

Rabbit holes are allowed. Rabbitwarden’s job is to keep them deliberate, bounded, and recoverable.

Tagline candidates:

- **Wander deliberately.**
- **A local guardian for your AI-assisted rabbit holes.**

## Core problem

The user runs many AI coding agents in parallel across terminal panes, IDEs, desktop apps, and repos. These agents often persist session logs locally, but there is no central place to see:

- all active sessions
- repo/worktree/branch context
- session IDs and resume commands
- task intent / current thread
- fan-out and split-off sessions
- abandoned work
- dirty repos caused by agent work
- whether the work is still useful or just dopamine-driven exploration

The user does not want one fixed daily goal. Goals change throughout the day. The missing piece is deliberateness, continuity, and wellbeing.

## MVP surfaces

### Primary: menu bar / tray app

A dashboard alone is insufficient because the user will forget to check it.

The menu bar app should show:

- active thread count
- active session count
- WIP / rabbit-hole count
- quick list of sessions grouped by thread/repo
- current warnings or close-loop suggestions

It should send OS-level notifications for high-signal events.

### Secondary: dashboard

The dashboard can provide richer review:

- timeline
- branch/split graph
- session transcript previews
- idea register
- close-loop queue
- dirty repo overview

## Important future surface

Later, coding-agent extensions/addons can tap Rabbitwarden data and show feedback inside the agent harness itself.

Examples:

- pi extension
- Claude Code command/skill/plugin
- Codex extension/tooling
- VS Code/Cursor extension

## Identity model

Rabbitwarden must distinguish **harness**, not model/provider.

A session’s identity is:

```text
harness + session_id + log_path
```

Useful continuation context is:

```text
repo/worktree path + branch + session_id
```

Model/provider is not product identity. It may be stored as optional debug metadata, but Rabbitwarden should not label a session as “Codex work” merely because pi used an OpenAI Codex model.

Correct example:

> pi session in `ai-architecture-and-interior`, branch `main`, session `019ee497…`

Incorrect example:

> Codex session

Reason: the user resumes and understands work through the harness and repo, not through the model provider.

## SessionRef schema

```ts
type Harness =
  | "pi"
  | "claude-code"
  | "codex"
  | "cursor"
  | "copilot"
  | "openclaw"
  | "unknown";

type Surface =
  | "cli"
  | "desktop"
  | "vscode"
  | "jetbrains"
  | "subagent"
  | "extension"
  | "unknown";

type SessionRef = {
  harness: Harness;
  surface?: Surface;

  sessionId: string;
  logPath: string;

  cwd?: string;
  gitRepoRoot?: string;
  worktreePath?: string;
  branch?: string;
  headSha?: string;

  startedAt: string;
  lastActivityAt: string;

  parentSessionId?: string;
  threadId?: string;

  firstUserPrompt?: string;
  latestUserPrompt?: string;
  inferredGoal?: string;

  status?: "active" | "idle" | "complete" | "abandoned" | "unknown";

  resumeCommand?: string;
  inspectCommand?: string;

  // Optional only. Do not use for product identity/labelling.
  debug?: {
    provider?: string;
    model?: string;
    rawMetadata?: unknown;
  };
};
```

## Thread model

A thread is a higher-level work trail that may contain many sessions, subagents, or handoffs.

```ts
type Thread = {
  id: string;
  title: string;
  intent?: "main-trail" | "rabbit-hole" | "parked-burrow" | "play" | "unknown";
  valueState?: "useful-now" | "useful-later" | "useful-to-others" | "pure-play" | "dopamine-loop" | "unclear";
  sessions: SessionRef[];
  parentThreadId?: string;
  repoRoots: string[];
  createdAt: string;
  lastActivityAt: string;
  closureState?: "open" | "summarized" | "committed" | "parked" | "abandoned" | "done";
};
```

Thread grouping should use:

- explicit parent session IDs where available
- harness-native parent/subagent metadata
- same repo/worktree and nearby timestamps
- handover prompts
- repeated TODO IDs
- temporary chain directories
- similar first/current prompts

## Core modes / states

### Main trail

Current intended focus.

### Rabbit hole

Intentional exploration. Not bad. May be timeboxed.

### Parked burrow

Saved idea or thread that is not active now but should be recoverable later.

### Dopamine loop

A possible stimulation loop where activity is high but durable value is unclear.

This should be framed gently as a check, not a judgement.

## Dopamine Check

Rabbitwarden can explicitly use the phrase “Dopamine Check”.

Example notification:

> Dopamine check: you’ve opened 5 new trails in 45 minutes. Is this still valuable, or are you chasing the next interesting thing?

Quick responses:

- This is useful now
- Useful later — park it
- This is play — timebox it
- I’m avoiding something
- I don’t know — help me clarify
- Stop nudging this thread

Signals:

- many sessions in a short time
- many repos/worktrees touched in a short time
- repeated similar prompts across harnesses
- lots of research without note/commit/TODO/decision
- many subagents spawned without clear closure
- late-night high-intensity activity
- dirty repos after an idle session

## Close-loop feature

Rabbitwarden should help finish things, not just focus.

Close-loop signals:

- session idle for many hours
- dirty repo/worktree
- untracked files created by agent work
- no commit / stash / TODO / summary after a long session
- handover prompt exists but no follow-up
- TODO claimed but not closed
- branch created but not merged/pushed/abandoned

Possible actions:

- summarize session
- create TODO
- park as idea
- mark abandoned
- open repo
- resume session
- stash/commit reminder
- link to parent thread
- write “Future Me” note

Example:

> This thread started as “build annotation pipeline” and ended with uncommitted files. Close the loop: commit, park, summarize, or abandon?

## Wellbeing behavior

Rabbitwarden should track cognitive load, not just productivity.

Wellbeing signals:

- too many active threads
- too many context switches
- late-night work bursts
- repeated unfinished loops
- lots of “one more thing” prompts
- work continuing after fatigue signals

Tone examples:

- “Want a 2-minute reset?”
- “Pick one trail for the next 30 minutes?”
- “Would Future You understand what happened here?”
- “This looks like momentum. Still useful?”
- “You can park this without losing it.”

Evening mode should use softer prompts around wind-down, summary, and parking.

## Idea register

Rabbitwarden maintains a system-wide local idea register.

```ts
type Idea = {
  id: string;
  title: string;
  notes?: string;
  createdAt: string;
  sourceSession?: SessionRef;
  sourceThreadId?: string;
  repoRoot?: string;
  branch?: string;
  worktreePath?: string;
  tags?: string[];
  status: "parked" | "active" | "done" | "abandoned";
  resumeCommand?: string;
};
```

Use cases:

- save rabbit holes without pursuing them now
- preserve context for future continuation
- capture ideas generated by agent sessions
- link ideas to repo/branch/session IDs

## Thread graph / timeline

Not required for MVP, but must be designed for.

Rabbitwarden should eventually show how work spirals:

```text
Morning trail: improve Review Council
  ├─ pi session: quality plan
  ├─ codex session: implement risk lenses
  │   ├─ codex subagent: issue finder
  │   └─ codex subagent: reviewer
  └─ parked burrow: build Rabbitwarden
```

Graph edges can come from:

- parent session IDs
- subagent metadata
- handover prompts
- “continue in fresh session” prompts
- same repo/branch and close timestamps
- repeated TODO/issue references

## Log locations / collectors

Collectors should be adapter-based. Log formats can and will change.

Each collector should emit normalized `SessionRef` records while preserving raw metadata for debugging.

### pi

Observed locally:

```text
~/.pi/agent/sessions/<encoded-cwd>/*.jsonl
```

Environment override:

```text
PI_CODING_AGENT_SESSION_DIR
```

Resume support from `pi --help`:

```text
pi --session <path|id>
pi --continue
pi --resume
pi --fork <path|id>
```

Recommended resume command:

```bash
cd <worktree>
pi --session <logPath-or-sessionId>
```

Prefer storing exact `logPath` because partial IDs can be ambiguous.

### Claude Code

Documented location:

```text
~/.claude/projects/<encoded-project-path>/<session-id>.jsonl
```

If set, `CLAUDE_CONFIG_DIR` changes the base directory.

Resume support from `claude --help`:

```text
claude --resume <session-id>
claude --continue
claude --session-id <uuid>
```

Recommended resume command:

```bash
cd <worktree>
claude --resume <sessionId>
```

### Codex CLI / Codex Desktop / Codex VS Code extension

Documented and observed location:

```text
$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl
```

Default:

```text
~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
```

Codex Desktop can write to the same session tree. The JSONL metadata may contain `originator: "Codex Desktop"`.

Resume support from `codex resume --help`:

```text
codex resume [SESSION_ID]
codex resume --last
codex resume --all
codex resume -C <DIR> <SESSION_ID>
```

Recommended resume command:

```bash
codex resume -C <worktree> <sessionId>
```

### GitHub Copilot CLI

Documented location:

```text
~/.copilot/session-state/
```

It also has a local SQLite session store for Chronicle/search.

Collector should treat this as structured session state, not necessarily JSONL-only.

### GitHub Copilot Chat in VS Code

Per-workspace VS Code storage.

macOS stable VS Code:

```text
~/Library/Application Support/Code/User/workspaceStorage/<hash>/chatSessions/
~/Library/Application Support/Code/User/workspaceStorage/<hash>/state.vscdb
```

macOS VS Code Insiders:

```text
~/Library/Application Support/Code - Insiders/User/workspaceStorage/<hash>/chatSessions/
~/Library/Application Support/Code - Insiders/User/workspaceStorage/<hash>/state.vscdb
```

Useful SQLite keys reported in community sources:

```text
interactive.sessions
memento/interactive-session
chat.ChatSessionStore.index
```

Collector should map workspace hashes back to repos using `workspace.json` where available.

### Cursor / cursor-agent

Cursor appears to use several layers, not one clean transcript store.

Evidence suggests:

```text
~/.cursor/chats/*/*/store.db
~/.cursor/projects/*/agent-transcripts/*.jsonl
~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/state.vscdb
```

Collector should start with transcript JSONL where available, then add SQLite support.

### Claude Desktop

Claude Desktop app data on macOS appears under:

```text
~/Library/Application Support/Claude/
```

Possible relevant stores include:

```text
~/Library/Application Support/Claude/IndexedDB/
~/Library/Application Support/Claude/local-agent-mode-sessions/
```

This needs further verification per Claude Desktop/Cowork/local-agent-mode version. Treat as non-MVP.

## MVP scope

MVP should support:

1. pi collector
2. Claude Code collector
3. Codex collector
4. local normalized SQLite database
5. menu bar/tray process
6. OS notifications
7. close-loop queue
8. basic idea register
9. resume/open commands

MVP does not need:

- perfect goal inference
- full graph visualization
- Cursor/Copilot support
- cloud sync
- blocking/enforcement
- model/provider analytics

## MVP notifications

High-signal notifications only:

- “New trail?” when a new repo/session starts near another active thread
- “Dopamine check” after burst thresholds
- “Close loop?” for dirty idle repos/sessions
- “Too many active trails” when WIP limit exceeded
- “Evening wrap?” during late sessions

Avoid noisy constant reminders.

## WIP limits

User-configurable thresholds:

```ts
type WipPolicy = {
  maxActiveThreads?: number;
  maxRabbitHoles?: number;
  maxNewSessionsPerHour?: number;
  maxRepoSwitchesPerHour?: number;
  quietHours?: { start: string; end: string };
  eveningModeAfter?: string;
};
```

Rabbit holes are first-class, not violations.

## Inference principles

Goal inference should be helpful but humble.

Rabbitwarden should show:

- first user prompt
- latest user prompt
- inferred title
- confidence
- evidence snippets

It should allow manual correction.

Example:

```text
Inferred: “Build annotation pipeline for interior critique images”
Evidence: first prompt + STATUS.md + latest TODO
Confidence: medium
```

## Privacy and locality

Default: local-only.

- Do not upload transcripts by default.
- Do not call cloud LLMs by default.
- Store paths and transcript-derived summaries locally.
- Make redaction configurable.
- Treat session logs as sensitive: they may contain secrets, prompts, tool output, personal notes, and local file paths.

Optional LLM inference can be added later behind explicit configuration.

## Open questions

- Should the first implementation be a native macOS menu bar app, Tauri app, Electron app, or simple local service + SwiftBar/xbar script?
- How aggressive should notifications be by default?
- Should Rabbitwarden write summaries back into repos, or only into its own local database?
- Should parked ideas be Markdown files, SQLite records, or both?
- Should resume actions open Ghostty/tmux sessions directly?
- How should Rabbitwarden detect active terminal panes vs merely recently modified logs?
