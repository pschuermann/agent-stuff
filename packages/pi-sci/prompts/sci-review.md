---
description: Adversarially review a file, claim, or draft for unsupported claims and citation gaps
argument-hint: "<file-or-claim>"
---

Review this file, claim, or draft for factual support: $ARGUMENTS

If no file, claim, or draft was provided, ask for the target and stop.

Use the Sci claim-review workflow. Be adversarial but fair. Do not rewrite the target unless explicitly asked; produce a review report.

Artifact:

- `outputs/<slug>-review.md`

Rules:

- If the target is a file path, read it first.
- If the target is inline text, review that text and choose a short slug.
- Create `outputs/` if needed.
- Ask before overwriting an existing review unless overwrite was explicitly requested.
- Check factual support, not style alone.
- Distinguish observation, inference, interpretation, and speculation.

Review for:

- unsupported factual claims
- missing or weak citations
- overclaiming
- single-source critical claims
- unverified quantitative claims
- cherry-picked evidence
- unclear inference vs observation
- source/date mismatch
- claims that need primary sources

Write `outputs/<slug>-review.md` with:

```md
# Claim Review: <target>

## Verdict

## FATAL: must fix before publication/delivery

| Claim | Problem | Evidence needed | Suggested fix |
|---|---|---|---|

## MAJOR: should fix or disclose

| Claim | Problem | Evidence needed | Suggested fix |
|---|---|---|---|

## MINOR: polish / clarity

| Claim | Problem | Suggested fix |
|---|---|---|

## Unsupported or under-supported claims checklist

## Citation gaps

## Quantitative claims checked

## Inference vs observation issues

## Recommended next verification steps
```

Final response: give the review path and the top FATAL/MAJOR issues.
