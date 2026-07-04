---
name: sci-claim-review
description: Adversarial review workflow for drafts, files, and claims to find unsupported factual claims, citation gaps, overclaiming, single-source critical claims, and unverified quantitative claims. Use when the user asks to verify, fact-check, review support, or audit claims.
---

# Sci Claim Review

Use this skill to adversarially review claims, drafts, and research artifacts for factual support.

Prefer `/sci-review` when available. Otherwise follow the same workflow manually.

## Rules

- Execute the review and write the artifact; do not merely explain the review method.
- Review support, citations, and claim strength; do not rewrite unless asked.
- Distinguish observation, inference, interpretation, and speculation.
- A citation is not enough: verify whether it supports the exact claim when the source is available.
- Treat uncited quantitative claims as suspect until verified.
- Flag single-source critical claims.
- Mark missing primary sources when secondary sources are not enough.
- Do not claim a source, URL, number, or experiment was checked unless it was actually checked.
- If external verification is needed but unavailable, mark it `BLOCKED`.
- Verify the review file exists before claiming completion.

## Artifact

```text
outputs/<slug>-review.md
```

## Checks

- unsupported factual claims
- missing, weak, stale, or mismatched citations
- overclaiming
- single-source critical claims
- unverified quantitative claims
- cherry-picked evidence
- unclear inference vs observation
- source/date mismatch
- claims needing primary sources
- claims of verification, reproduction, or confirmation without evidence of the check

## Severity guidance

- `FATAL`: likely false, materially unsupported, misleading, or unsafe to publish/deliver without fixing.
- `MAJOR`: plausible but under-supported, overconfident, missing important caveat, or dependent on one weak source.
- `MINOR`: clarity, wording, citation precision, or limited-scope caveat.

## Report format

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

## Blocked checks

## Recommended next verification steps
```
