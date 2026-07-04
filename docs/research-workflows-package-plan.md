# Research Workflows Package Plan

## Working goal

Build a small, auditable Pi package inside `agent-stuff` that copies the useful parts of Feynman without the suspicious parts: no telemetry, no runtime patching, no auto-installing system packages, no hidden browser-cookie access.

The package should help an agent do research work by enforcing a repeatable workflow:

1. plan before broad work
2. gather evidence into files
3. draft from evidence
4. add citations/source links
5. review unsupported claims
6. write a final artifact plus provenance

## Package vs extension

This should be a **Pi package**.

Reason: a Pi package can bundle all resource types we want:

- prompt templates in `commands/` or `prompts/`
- skills in `skills/`
- optional subagent definitions if we add them later
- a small extension only if we need runtime behavior
- themes/docs if useful

A Pi extension alone is too narrow. Extensions are best for registering tools, commands, UI widgets, or intercepting events. The first version of this project mostly needs workflow instructions and reusable slash commands, not custom runtime code.

Recommended shape:

```text
agent-stuff/
  packages/
    pi-sci/
      package.json             # self-contained Pi package manifest
      README.md
      prompts/                 # slash workflows / prompt templates
        sci-plan.md
        sci-research.md
        sci-lit.md
        sci-compare.md
        sci-review.md
      skills/
        sci-research-workflows/
          SKILL.md
        sci-literature-review/
          SKILL.md
        sci-source-comparison/
          SKILL.md
        sci-claim-review/
          SKILL.md
      docs/
        examples.md
  docs/
    research-workflows-package-plan.md
```

Keep this as a separate local package under `packages/pi-sci/` rather than wiring it into the root `mitsupi` package. This keeps upstream refreshes low-conflict and avoids loading unrelated personal extensions when someone only wants the research workflow package.

## Non-goals

Do not copy these Feynman behaviors:

- default telemetry
- dependency/runtime patching
- automatic Homebrew/npm installs at startup
- automatic `.env` loading beyond what Pi already does
- browser cookie access unless explicitly implemented as an opt-in tool
- broad vendor-specific model setup
- bundled third-party research APIs unless the user explicitly configures them

## Name options

Shortlist:

1. **Scribe** — clean, artifact-oriented, good for reports and provenance.
2. **Ledger** — emphasizes evidence trails and source accounting.
3. **Fieldnotes** — research notebook feel; friendly and non-grandiose.
4. **Quill** — writing/research vibe, short command names possible.
5. **Groundwork** — emphasizes source grounding before conclusions.
6. **Cairn** — leaves trail markers through research; distinctive.
7. **Trace** — provenance and claim tracing; very direct.
8. **Briefcase** — packaged research briefs and artifacts.
9. **Grist** — raw material for synthesis; compact and memorable.
10. **Sourcecraft** — explicit about source-backed writing.

Chosen name: **sci**.

Rationale: short, obvious research/science association, easy slash-command prefix, and modest enough that it feels like a workflow toolkit rather than a replacement agent.

Possible command namespace:

```text
/sci-plan
/sci-research
/sci-lit
/sci-compare
/sci-review
```

Optional alternate shape if we later add a command-router extension:

```text
/sci plan
/sci research
/sci lit
/sci compare
/sci review
```

## Core workflows to implement

### 1. Research plan

Command: `/sci-plan <topic>`

Purpose: create a plan artifact before a broad investigation.

Output:

```text
outputs/.plans/<slug>.md
```

Plan sections:

- objective
- key questions
- evidence needed
- source strategy
- likely artifacts
- task ledger
- verification log
- open decisions

Behavior:

- create the plan file immediately
- ask for confirmation before expensive/broad research
- keep the plan updated during long work

### 2. Deep research brief

Command: `/sci-research <topic>`

Purpose: source-heavy investigation with a final artifact.

Required outputs:

```text
outputs/.plans/<slug>.md
outputs/.drafts/<slug>-notes.md
outputs/.drafts/<slug>-draft.md
outputs/.drafts/<slug>-cited.md
outputs/<slug>.md
outputs/<slug>.provenance.md
```

Workflow:

1. write plan
2. gather evidence
3. record evidence table in notes
4. draft findings
5. add citations/source URLs
6. run self-review for unsupported claims
7. write final output and provenance

### 3. Literature review

Command: `/sci-lit <topic>`

Purpose: paper-focused review.

Output should include:

- reading map
- important papers/sources
- consensus
- disagreements
- open questions
- recommended reading order
- source URLs/identifiers

### 4. Source comparison

Command: `/sci-compare <sources-or-topic>`

Purpose: compare claims across multiple sources.

Output should include:

- source table
- claim matrix
- agreements
- contradictions
- confidence levels
- strongest supported conclusion

### 5. Claim / draft review

Command: `/sci-review <file-or-claim>`

Purpose: adversarially review a draft, plan, or claim set.

Checks:

- unsupported factual claims
- missing citations
- overclaiming
- single-source critical claims
- unverified quantitative claims
- unclear inference vs observation

Output:

```text
outputs/<slug>-review.md
```

Findings grouped as:

- FATAL: must fix before publication/delivery
- MAJOR: should fix or disclose
- MINOR: polish / clarity

## Skill design

Add prefixed skills to avoid collisions with generic skill names:

- `sci-research-workflows`
- `sci-literature-review`
- `sci-source-comparison`
- `sci-claim-review`

The skills should trigger when the user asks for deep research, literature reviews, source comparison, research briefs, provenance, evidence tables, or claim verification.

Each skill should instruct the agent to use the slash commands where available, or manually follow the same artifact workflow when commands are unavailable.

Keep skill instructions terse and procedural. Avoid turning them into giant system prompts.

## Optional extension later

Only add an extension after the prompt/skill version proves useful.

Candidate extension features:

- `/outputs` browser for recent artifacts
- `/research-init` to create `outputs/`, `outputs/.plans/`, `outputs/.drafts/`, `papers/`, `notes/`
- a custom tool to create/update provenance sidecars safely
- maybe a compact status widget showing current research artifact paths

Extension rules:

- no telemetry
- no network calls unless a visible tool explicitly requests them
- no package installs
- no shell execution in startup hooks
- no mutation of files outside the current workspace except Pi-managed config if explicitly requested

## Implementation phases

### Phase 1: resource-only package

- Add a self-contained package under `packages/pi-sci/`.
- Add prompt templates under `packages/pi-sci/prompts/`.
- Add skills under `packages/pi-sci/skills/`.
- Add docs and examples.
- Do not edit the root package manifest unless explicitly needed.

Acceptance checks:

- `packages/pi-sci/package.json` exposes the resources under `pi.prompts` and `pi.skills`.
- Prompt files are visible through Pi command discovery after `pi install ./packages/pi-sci`.
- A manual dry run creates the expected plan/final/provenance files.

### Phase 2: workflow hardening

- Tune the prompts based on actual sessions.
- Add clear stop conditions and blocked/unverified labels.
- Add citation/provenance templates.
- Add examples of good outputs.

Acceptance checks:

- Direct small research task does not over-spawn subagents.
- Broad research task writes notes before synthesis.
- Review command catches unsupported claims in a sample draft.

### Phase 3: optional extension

- Add a small `research-artifacts.ts` extension only if command-only UX is clunky.
- Implement artifact browsing/init helpers.
- Keep it read-mostly and auditable.

Acceptance checks:

- Extension has no startup shell/network behavior.
- Extension only writes files on explicit command/tool invocation.
- Extension can be disabled without breaking prompt/skill workflows.

## Open decisions

- Final name: **sci**.
- Command prefix: use `/sci-*` prompt-template commands first; consider `/sci <subcommand>` only if we later add a router extension.
- Whether to include subagent role files now or wait.
- Whether final outputs should default to `outputs/` only, or support `papers/` for paper-style drafts.
