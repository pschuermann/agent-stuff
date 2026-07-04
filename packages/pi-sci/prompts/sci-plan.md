---
description: Create an auditable research plan artifact before broad work
argument-hint: "<topic>"
---

Create a research plan for: $ARGUMENTS

If no topic was provided, ask for the topic and stop.

Follow this workflow:

1. Choose a short, filesystem-safe slug from the topic.
2. Create these directories if needed:
   - `outputs/.plans/`
   - `outputs/.drafts/`
3. Write the plan immediately to `outputs/.plans/<slug>.md`.
4. Do not begin broad or expensive research yet.
5. Ask for confirmation before broad web search, large file scans, many subagents, paid APIs, or long-running commands.

The plan file must include:

```md
# Research Plan: <topic>

## Objective

## Key questions

## Evidence needed

## Source strategy

## Likely artifacts

## Task ledger

| Status | Task | Notes |
|---|---|---|

## Verification log

| Claim / check | Method | Status | Notes |
|---|---|---|---|

## Open decisions
```

After writing the file, reply with:

- the plan path
- the proposed research strategy in 3-5 bullets
- at most 3 questions or confirmations needed before continuing
