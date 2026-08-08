# Verification and Deterministic Guardrails

Use this reference during Phase 5 or when the user asks how to enforce constructive type design. No generic linter can prove a model is well chosen. Deterministic checks enforce specific consequences of a chosen design and expose likely weak points.

## Evidence hierarchy

| Evidence | What it establishes | What it does not establish |
|---|---|---|
| Compiler/typechecker | Values and branches obey the encoded static contract | The contract matches the domain or cannot be bypassed at runtime |
| Exhaustiveness lint/check | Known variants are handled at checked match sites | Open-world values, unsafe casts, catch-alls, or untyped boundaries are safe |
| Private fields/constructors | Ordinary callers cannot directly manufacture values | Reflection, deserialization, mutation, package-private code, or unsafe paths preserve the invariant |
| Boundary parser tests | Representative input is accepted/rejected correctly | Every input or every downstream mutation is safe |
| Property-based tests | Broad generated inputs preserve stated properties | The property itself is complete or the generator reaches important states |
| Mutation check | A selected weakened guarantee is detected | All possible defects would be detected |
| Semgrep/AST smell rule | Suspicious syntax receives review | The design is wrong or the flagged code is exploitable |

Prefer the strongest inexpensive evidence available, and describe its limits.

## Compiler and lint gates

### Cross-language goals

- Enable strict null/option checking.
- Require or lint exhaustive matching on closed variants.
- Fail on unchecked or unsafe operations in domain modules unless narrowly allowed.
- Keep external/wire types from leaking beyond adapter modules.
- Derive internal types from authoritative schemas when the ecosystem supports it.

### TypeScript

Useful project settings and rules include:

- `strict`
- `exactOptionalPropertyTypes`
- `noUncheckedIndexedAccess`
- typed ESLint rules such as `switch-exhaustiveness-check`
- project-specific bans or review requirements for non-null assertions and broad `as` casts

A blanket ban on every cast can be counterproductive at trusted interoperability boundaries. Confine and document them instead.

### Rust

- Exhaustive `match` is built into the language for enums.
- Consider Clippy restrictions such as `unwrap_used` in domain/application modules, with narrow allowances in tests or demonstrably infallible setup.
- Keep fields private and audit `serde` derives or custom deserializers.
- Use compile-fail tests when the public API’s uncallability is itself important.

### Scala, Java, and Kotlin

- Turn non-exhaustive sealed-type matches into errors where compiler configuration permits.
- Avoid catch-all/default branches on closed domain variants unless unknown values are a real compatibility requirement.
- Keep constructor/factory visibility aligned with the claimed invariant.

### Python and Go

Static enforcement is weaker, so combine strict typechecking/linting with runtime construction tests:

- Python: strict mypy/pyright modes, `assert_never`, runtime schema parsing, immutable/frozen values where appropriate.
- Go: unexported fields, package-level constructors, tests for zero values and decode paths, and a lint/review convention for type-switch defaults. Do not claim compiler-enforced exhaustiveness.

## Architecture boundaries

A strong boundary rule is often more useful than a generic validator rule:

```text
wire/DTO/schema value -> adapter parser -> domain value -> total business operation
```

Enforce this with the project’s architecture tooling when available:

- dependency-cruiser or ESLint import restrictions for TypeScript;
- ArchUnit for Java;
- import-linter for Python;
- package/module visibility and dependency rules in other ecosystems.

Example policy: domain modules may not import transport DTOs; adapters may import both and perform the conversion.

## Static smell detection

Use Semgrep, ast-grep, or project lint rules as review triggers for patterns such as:

- `validate*`/`check*` returning `void`, unit, or boolean while callers continue using the original weak value; exclude sound control-flow assertions such as checked TypeScript `asserts` functions;
- `panic`, `unwrap`, unchecked indexing, non-null assertion, forced cast, or “should never happen”;
- records combining a boolean with fields required only when the boolean is true;
- multiple optional fields constrained by comments such as “at least one” or “exactly one”;
- catch-all/default branches over a closed variant;
- raw DTO/unknown/map values flowing into domain modules.

Do not make every smell an unconditional CI failure. Validators returning booleans, assertions, and catch-alls all have legitimate uses. Escalate high-confidence project-specific patterns; keep broad rules advisory.

## Parser and constructor properties

For a parser `parse: Raw -> Result<Strong, Error>` and renderer/accessor where applicable, consider:

1. **Successful outputs satisfy the invariant.** Check through public observations, not private field duplication.
2. **Known invalid classes reject.** Include empty, boundary, duplicate, contradictory, and near-valid inputs.
3. **Round-trip.** `parse(render(value))` returns an equivalent strong value when the format promises round-tripping.
4. **Normalization idempotence.** If parsing normalizes, normalizing twice has the same result.
5. **No partial effects.** Rejected boundary input does not leave writes, emitted events, or external calls behind.
6. **Transitions preserve validity.** Every public mutation/state transition returns another valid state.
7. **Construction is closed.** Public APIs, default/zero values, serializers, fixtures, and test helpers cannot bypass the intended gate without an explicitly unsafe name.

Use the project’s property-testing library when the input space is broad. Construct valid generated values directly rather than filtering random weak values until one passes.

## Proving the guardrail bites

When practical:

1. Select one small mutation that violates the claimed guarantee: remove a constructor check, add an unhandled variant, loosen a field to optional, or bypass boundary conversion.
2. Run the focused compiler/test/lint command and confirm failure.
3. Revert the mutation.
4. Preserve any discovered runtime counterexample as a deterministic regression test.

If the mutation survives, one of four things is true:

- the type/compiler gate does not cover the path;
- the test/property is too weak;
- the generator never reaches the state;
- the behavior was not actually required.

Resolve or report which one applies.

## Completion report

Report compactly:

```markdown
- Removed partial case: <operation and previously admitted state>
- Established at: <parser/constructor/producer boundary>
- Enforcement: <compiler/private API/runtime parser>
- Verification: <commands and result>
- Residual limits: <escape hatches, unchecked boundaries, retained partiality>
```
