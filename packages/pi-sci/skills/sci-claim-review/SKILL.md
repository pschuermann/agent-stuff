---
name: sci-claim-review
description: Adversarial review workflow for drafts, files, and claims to find unsupported factual claims, citation gaps, overclaiming, single-source critical claims, and unverified quantitative claims. Use when the user asks to verify, fact-check, review support, or audit claims.
---

# Sci Claim Review

Use this skill to adversarially review claims, drafts, and research artifacts for factual support.

## Rules

- Review support, citations, and claim strength; do not rewrite unless asked.
- Distinguish observation, inference, interpretation, and speculation.
- Treat uncited quantitative claims as suspect until verified.
- Flag single-source critical claims.
- Mark missing primary sources when secondary sources are not enough.

## Artifact

```text
outputs/<slug>-review.md
```

## Checks

- unsupported factual claims
- missing or weak citations
- overclaiming
- single-source critical claims
- unverified quantitative claims
- cherry-picked evidence
- unclear inference vs observation
- source/date mismatch
- claims needing primary sources

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

## Recommended next verification steps
```

Prefer `/sci-review` when available. Otherwise follow the same workflow manually.
