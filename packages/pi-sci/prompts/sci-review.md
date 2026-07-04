---
description: Adversarially review a file, claim, or draft for unsupported claims and citation gaps
argument-hint: "<file-or-claim>"
---

Review this file, claim, or draft for factual support: $ARGUMENTS

If no file, claim, or draft was provided, ask for the target and stop.

This is an execution request. Do not explain the review protocol. Produce the review artifact.

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
- A citation is not enough: verify whether it supports the exact claim when the source is available.
- Do not claim a source, URL, number, or experiment was checked unless you actually checked it.
- If external verification is needed but unavailable, mark the finding `BLOCKED` rather than guessing.

Review for:

- unsupported factual claims
- missing, weak, stale, or mismatched citations
- overclaiming
- single-source critical claims
- unverified quantitative claims
- cherry-picked evidence
- unclear inference vs observation
- source/date mismatch
- claims that need primary sources
- claims of verification, reproduction, or confirmation without evidence of the check

Severity guidance:

- `FATAL`: likely false, materially unsupported, misleading, or unsafe to publish/deliver without fixing.
- `MAJOR`: plausible but under-supported, overconfident, missing important caveat, or dependent on one weak source.
- `MINOR`: clarity, wording, citation precision, or limited-scope caveat.

Write `outputs/<slug>-review.md` with:

```md
# Claim Review: <target>

## Verdict

State whether the draft/claim is ready, needs fixes, or is blocked by missing evidence.

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

## Blocked checks

## Recommended next verification steps
```

Before the final response, verify on disk that `outputs/<slug>-review.md` exists. If it cannot be completed, write a blocked review artifact with the failure reason.

Final response: give the review path and the top FATAL/MAJOR issues.
