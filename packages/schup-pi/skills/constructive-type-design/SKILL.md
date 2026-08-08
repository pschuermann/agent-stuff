---
name: constructive-type-design
description: >-
  Design or refactor typed code so required operations are total and learned
  invariants survive in the data representation. Use whenever work involves
  domain models, function signatures, parsers or validators, coupled optional
  fields, boolean state flags, smart constructors, discriminated unions or
  enums, non-empty collections, exhaustive matching, unchecked casts, null
  assertions, panic/unwrap/throw paths, “should never happen” branches, making
  illegal states unrepresentable, type-driven design, or “parse, don’t
  validate.” Also use during code review when a type may be too weak or
  needlessly precise. Do not use for ordinary database schema/ER modeling or
  input sanitization alone.
---

# Constructive Type Design

Use types to carry the obligations that connect producers and consumers. The goal is the simplest representation that lets the required code remain total, not the most precise description imaginable.

## Essential principles

1. **Construct positive space.** Build legal values from product and sum types instead of starting with a broad shape and scattering checks that subtract illegal cases. A representation may differ from the first domain interpretation.
2. **Let consumers determine useful precision.** Strengthen a type when a concrete operation would otherwise panic, throw, assert, or carry an impossible branch. Precision that removes no partial operation usually adds ceremony without safety.
3. **Preserve learned information.** Boundary code should transform less-structured input into a type that records what was learned. A validator returning `void` or `bool` often throws the proof away.
4. **Propagate obligations to the right place.** Write the total consumer signature you want, then follow compiler errors toward producers until reaching the boundary best equipped to decide. Do not force every downstream caller to rediscover the same fact.
5. **Use honest enforcement.** Prefer exhaustive matches and representations that cannot construct the bad state. When that encoding is impractical, use a private/opaque type with a smart constructor and acknowledge the trusted surface that must preserve the invariant.

## When to use

- Designing or changing domain types, state machines, request models, or function signatures.
- Refactoring coupled optional fields, boolean flags, magic states, or primitive-heavy APIs.
- Replacing scattered validation, redundant null checks, unchecked casts, or impossible branches.
- Reviewing code that uses `panic`, `unwrap`, non-null assertions, partial collection operations, or comments such as “should never happen.”
- Parsing JSON, configuration, database rows, CLI input, messages, or external API payloads into internal types.
- Deciding whether a newtype, branded type, smart constructor, non-empty collection, or more advanced type feature earns its cost.

## When not to use

- Physical database schema, normalization, indexes, or ER diagrams without an application-type question: use the project’s database/schema workflow.
- Security sanitization, authorization, rate limiting, SQL parameterization, or output encoding: use the relevant security practice. A domain type does not replace these controls.
- UI layout, formatting, and other code with no meaningful state or partial operation: use the ordinary implementation workflow.
- A tiny throwaway prototype where no static or runtime boundary can preserve the invariant: use simple runtime checks and tests, then revisit if the code survives.
- Requests limited to testing an already chosen representation: use `robust-testing` or `property-based-testing` when available.

## Workflow

Follow [the constructive design workflow](workflows/apply-constructive-design.md). Read it before proposing or editing types.

Use [representation patterns](references/representation-patterns.md) when choosing among products, sums, alternate representations, smart constructors, and language-specific encodings. Use [verification](references/verification.md) before declaring an implementation complete or when recommending deterministic guardrails.

## Quick reference

| Signal | First question | Likely direction |
|---|---|---|
| `panic`, `unwrap`, impossible/null branch | What input makes this operation undefined? | Strengthen that consumer’s input or return an honest failure |
| Validator returns `void`/`bool` | What fact did it learn? | Return a type that preserves the fact |
| Coupled optionals or boolean plus dependent fields | Which combinations are actually legal? | Sum type / discriminated union |
| Repeated checks deep in business logic | Where did the unstructured value enter? | Parse once at the boundary |
| List used by both `sum` and `head` | Which operation is partial? | Keep `List` for `sum`; require `NonEmpty` only for `head` |
| Desire to brand every string or ID | What bug or partial operation does the distinction prevent? | Add a speed bump only when its ergonomic value earns the cost |
| Complex refinement/dependent type proposed | Can products, sums, or a different representation do it? | Prefer the simpler construction; use advanced features for convenience |

## Required judgment

Do not apply “make illegal states unrepresentable” mechanically. Before strengthening a type, answer:

1. Which concrete operation becomes total?
2. Which failure branch disappears?
3. Where is the value constructed, and can that boundary establish the fact once?
4. What reuse, conversion, performance, or migration cost does the stronger type introduce?
5. Would a simpler representation or an honest `Option`/`Result` communicate the contract better?

If the first two answers are “none,” keep the simpler type unless the user explicitly wants an ergonomic speed bump such as distinct ID or unit types.

## Output expectations

For implementation work, keep the working obligation ledger internal unless it clarifies a significant trade-off. In the final response report:

- the partial case or illegal state removed;
- the boundary or producer that now establishes the invariant;
- the typecheck, tests, lint, or mutation check run;
- any remaining trusted constructor, unchecked escape hatch, or deliberately retained partial operation.

For design-only work, show the important before/after signatures and explain why the proposed precision is sufficient. For review-only work, cite concrete locations and distinguish correctness failures from optional ergonomic improvements.

## Rationalizations to reject

| Rationalization | Why it fails |
|---|---|
| “More precise types are always safer.” | Precision can reduce reuse and increase conversions while eliminating no runtime failure. |
| “Every domain string deserves a wrapper.” | A wrapper may only be a speed bump. Add it for demonstrated confusion, required operations, or boundary evidence. |
| “We validated it earlier.” | If the result still has the weak type, downstream code cannot rely on what validation learned. |
| “The cast tells the compiler the invariant.” | A cast suppresses the proof obligation; it does not discharge it. |
| “A smart constructor makes the state impossible.” | Only private construction plus invariant-preserving mutation closes the trusted surface. |
| “Boundary parsing replaces security checks.” | Parsing shapes data; authorization, resource limits, parameterization, and encoding remain separate controls. |
| “The test suite proves this branch is impossible.” | Tests sample executions. A constructive representation or exhaustive match proves a stronger local property. |

## Sources and related skills

- [Alexis King, “Parse, don’t validate”](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
- [Alexis King, “The Unreasonable Effectiveness of Constructive Data Modeling”](https://youtu.be/0BXuYlNrUmE)
- [pstack, “Type System Discipline”](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-type-system-discipline/SKILL.md), an MIT-licensed concise treatment that informed this skill’s scope
- `robust-testing`: verify parsers, state machines, constructors, and invariants with stronger tests
- `property-based-testing`: implement concrete properties and generators when available

## Success criteria

- [ ] A concrete consumer or failure mode justified every strengthened type.
- [ ] The chosen representation is the simplest one that makes required operations total.
- [ ] Boundary parsing preserves learned information instead of discarding it.
- [ ] Exhaustive handling or a closed construction surface enforces the invariant honestly.
- [ ] No unchecked cast or assertion was introduced merely to satisfy the compiler.
- [ ] Verification exercises construction failure and invariant-preserving behavior.
- [ ] Remaining partial operations and trusted surfaces are explicit.
