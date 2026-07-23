---
name: plainspoken-prose
description: "Draft or substantially rewrite reader-facing prose that the user explicitly asks to polish: posts, articles, emails, Slack announcements, web copy, narrative summaries and insights, or post-incident reviews. Do not activate merely because a task produces Markdown or another written artifact. Do not use for technical documentation, specifications, READMEs, architecture or design documents, prompts, non-PIR reports, plans, reviews, analyses, questions, or ordinary answers. An explicit request to use `plainspoken-prose` overrides these exclusions."
---

# Plainspoken Prose

Use this skill only for a reader-facing communication or narrative piece that the user explicitly asks to draft, rewrite, or polish. Use it while drafting the first version, not only as a cleanup pass. The goal is finished prose that feels clear, grounded, and unforced.

A request to “write,” “document,” “summarise,” or “make it concise” is not enough by itself. It may refer to a Markdown spec, technical document, prompt, non-PIR report, plan, code review, or ordinary answer; leave those to their domain skill. An explicit request for this skill always wins.

## Drafting Rules

- Preserve the user's intent, claims, emphasis, uncertainty, and level of detail.
- Prefer concrete, specific wording over polished generalities.
- Use ordinary words when they are precise enough.
- Let the structure follow the idea instead of imposing a template.
- Keep transitions useful and quiet.
- Keep the author's stance intact. Do not sand away tension, judgment, or specificity.
- Match the format the user asked for. Do not add process notes unless asked.

## Avoid

- Generic openings that announce the topic before saying anything.
- Inflated significance, faux profundity, or inspirational endings.
- Tidy three-part rhythms when the material does not naturally have three parts.
- Slogan-like conclusions, aphorisms, and manufactured punchlines.
- Contrast flips ("it's not just X, it's Y", "isn't X — it's Y", "X — not Y, not Z — did…"). The attribution test decides: a contrast stays only if the source or author explicitly made both halves of it — then keep it and attribute it. Otherwise delete the negated half and state the affirmative claim. Do not keep a flip because it feels like it's "doing work"; to the writer who just produced it, it always does.
- Overexplaining obvious stakes or adding reassuring summaries the reader does not need.
- Making the prose more dramatic, writerly, casual, or quirky than the source calls for.

## Final Check

Self-assessment questions do not catch these tells — the process that wrote them will grade them as fine. The check is mechanical.

**For prose being written to a file:** draft to a scratch file first, then lint it with the Vale style that ships with this skill (`vale/` directory here — rules for contrast flips, negation chains, framing hooks, vague unattributed claims, rhetorical self-answers, manufactured urgency, intensifiers, em-dashes, stock AI phrases, and the Kobak et al. excess-vocabulary list):

```bash
vale --config ~/.claude/skills/plainspoken-prose/vale/.vale.ini <draft>
```

Vale is markup-aware: code blocks and HTML comments are skipped automatically. Each alert's message states the fix. Resolve every **error** (rewrite, or attribute if the contrast is explicitly the source's own) and read every **warning** (intensifiers and excess-vocab words have legitimate uses — judge each hit, don't skip the scan). Exit code 0 with no unjustified warnings is the bar before saving.

If `vale` is unavailable, fall back to:

```bash
rg -n "—|not just|isn't [^.]* — it's|it's not [^,]*, it's|— not [^—]*, not|[Tt]he real (story|point|question|subject)|literally|genuinely|simply|truly|; it just" <draft>
```

When a new tell slips through to a reader, add a rule (or token) for it under `vale/styles/Plainspoken/` so the linter learns from the miss.

**Auditing an existing library of files:** running the Vale scan across a whole directory (not just one draft) is common when checking whether past output holds up. If the scan turns up errors in more than a handful of files (roughly 10+), don't fix them one by one yourself — batch the flagged files into groups and delegate fix-application to parallel subagents with a lower-power model override (e.g. haiku), each given the exact file:line hits and the attribution-test rule. Keep in the main loop: spot-checking a sample of their fixes for quality, deciding ambiguous attribution calls they escalate, and the final re-scan across the whole directory to confirm everything landed. This is mechanical, rule-following work at volume — exactly what should be handed off rather than done inline.

**For chat-only prose:** apply the same patterns by reading your draft against the Avoid list, sentence by sentence, before sending.

Example of the rewrite direction:

> ✗ "Salvatore's real subject here is what changed underneath the field, not just what changed in the models."
> ✓ "Salvatore takes stock of what changed underneath the field."

> ✗ "It was reinforcement learning against a verifiable signal — not RLHF, not just bigger pretraining — that let models exceed the ceiling."
> ✓ "Reinforcement learning against a verifiable signal is what let models exceed the ceiling."

Then confirm: the first sentence says something specific, and the ending stops where the thought ends.

Return the finished prose unless the user asks for alternatives, commentary, or a comparison.
