---
description: Create an auditable research plan artifact before broad work
argument-hint: "<topic>"
---

Create a research plan for: $ARGUMENTS

If no topic was provided, ask for the topic and stop.

This is an execution request. Do not merely describe a possible plan in chat. Create the plan artifact first, then summarize it.

Follow this workflow:

1. Choose a short, filesystem-safe slug from the topic.
2. Create these directories if needed:
   - `outputs/.plans/`
   - `outputs/.drafts/`
3. If `outputs/.plans/<slug>.md` already exists, ask before overwriting unless the user explicitly requested overwrite.
4. Write the plan immediately to `outputs/.plans/<slug>.md`.
5. Do not begin broad or expensive research yet.
6. Ask for confirmation before broad web search, large file scans, many subagents, paid APIs, or long-running commands.
7. Verify the plan file exists before replying.

The plan file must include:

```md
# Research Plan: <topic>

## Objective

## Key questions

## Evidence needed

## Source strategy

## Scale decision

State whether this should be lead-owned direct research or decomposed work. Use direct research for narrow questions and subagents only when decomposition clearly improves coverage or reduces context pressure.

## Likely artifacts

## Task ledger

| Status | Task | Owner | Notes |
|---|---|---|---|

## Verification log

| Claim / check | Method | Status | Notes |
|---|---|---|---|

## Source quality bar

List the source types that would count as strong support for this task. Prefer primary sources, official docs/data, papers, standards, direct statements, and raw artifacts.

## Open decisions
```

After writing the file, reply with:

- the plan path
- the proposed research strategy in 3-5 bullets
- the scale decision
- at most 3 questions or confirmations needed before continuing
