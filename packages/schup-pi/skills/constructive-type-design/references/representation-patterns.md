# Representation Patterns

Use this reference during Phase 3 when selecting an encoding. The examples illustrate judgment; adapt to the project’s language and conventions.

## Start from the consumer

A stronger type earns its cost when it changes what a consumer must handle.

| Consumer | Weak signature | Stronger or more honest signature | Why |
|---|---|---|---|
| Sum values | `List<T> -> T` | Keep `List<T> -> T` when an identity exists | Empty input already has a result |
| First/latest value | `List<T> -> T` plus panic | `NonEmpty<T> -> T` or `List<T> -> Option<T>` | Choose stronger input when the caller can establish non-emptiness; choose honest failure when it cannot |
| Notify a user | `Option<User> -> void` with impossible `None` | `User -> void` | Moves the missing-user decision to the caller with context |
| Build key lookup | `List<(K,V)>` plus duplicate checks | `Map<K,V>` or parser returning duplicate error | The structure records uniqueness |
| Handle state | Record of flags and optionals | Sum type with payload per state | Illegal combinations cannot be built; matching exposes obligations |

## Product and sum constructions

### Coupled optional fields

Weak representation:

```typescript
type User = {
  email?: Email;
  phone?: Phone;
}; // comment: at least one must be present
```

Constructive representation:

```typescript
type Contact =
  | { kind: "email"; email: Email }
  | { kind: "phone"; phone: Phone }
  | { kind: "both"; email: Email; phone: Phone };

type User = { contact: Contact };
```

This is useful when consumers need at least one contact method and handle the cases differently. If consumers merely forward an optional email and optional phone independently, the original shape may be sufficient.

### Boolean plus dependent data

Weak representation:

```typescript
type Job = {
  scheduled: boolean;
  scheduledAt?: Date;
};
```

Constructive representation:

```typescript
type JobSchedule =
  | { kind: "immediate" }
  | { kind: "scheduled"; at: Date };
```

Derive `scheduled` from the variant rather than maintaining two sources of truth.

## Alternate representations

### Non-empty collection

Represent one required element plus zero or more remaining elements:

```text
NonEmpty<T> = (head: T, tail: List<T>)
```

Use it at consumers that require an element. Do not replace every list merely because the domain claims collections are usually non-empty.

### Even-length sequence

Represent a sequence of pairs:

```text
EvenSequence<T> = List<(T, T)>
```

This changes the interface: retrieving the first item now exposes a pair unless an abstraction flattens it. The representation is good only when pair-wise operations fit the consumers.

### Ordered range

Possible representations:

```text
Range = (start: Instant, end: Instant)        where start <= end
Range = (start: Instant, duration: Duration)  where duration >= 0
```

`start + duration` constructs ordering positively and makes duration directly available. It may be worse when most consumers need the end timestamp, duration is expensive or ambiguous, or the system must preserve the exact external endpoints. Choose from actual operations, not aesthetic purity.

### Unique keys

A `Map<K,V>` makes duplicate keys absent from the resulting representation, but construction semantics still matter. A parser must reject duplicates if silently keeping the first or last value would lose information.

## Choosing between stronger input and honest failure

A partial function can usually become total in two ways:

1. **Strengthen the input** when a producer or boundary can establish the precondition once and downstream consumers should rely on it.
2. **Weaken the output** with `Option`, `Result`, or a typed error when absence/failure remains legitimate at the call site.

Do not automatically prefer either. Ask who has enough context to decide and whether the stronger fact remains true throughout the value’s lifetime.

## Smart constructors and opaque types

Use a smart constructor when direct positive construction is impractical, such as a bounded integer or context-dependent string format.

A smart constructor supports a real guarantee only when:

- callers cannot construct or mutate fields directly;
- all deserialization and persistence paths use the constructor or an equally trusted decoder;
- exposed operations preserve the invariant;
- unsafe/reflection/cast escape hatches are absent or explicitly audited.

A branded TypeScript cast by itself is not a parser. Keep the cast inside the checked constructor and prevent routine callers from manufacturing the brand.

## Primitive wrappers as speed bumps

`UserId` and `OrderId`, or meters and feet, can prevent accidental argument swaps. This is valuable ergonomics. Describe it accurately: it may prevent misuse without eliminating a partial function.

Add a wrapper when at least one applies:

- same-primitive arguments are repeatedly confused;
- the value has domain operations or normalization;
- construction learns a fact consumers use;
- the wrapper improves API readability enough to justify conversions.

Keep the primitive when it is transient, local, never interpreted, or only forwarded to another service.

## Language notes

### TypeScript

- Use discriminated unions and an exhaustive `never` check.
- `[T, ...T[]]` is an ergonomic non-empty array, but conversion from `T[]` still needs a checked parser.
- Infer types from boundary schemas where possible rather than duplicating interfaces.
- Broad `as` casts and non-null `!` are escape hatches; confine them to audited boundaries. A checked `asserts value is T` function can narrow soundly within a control-flow scope, but prefer a parser when the fact must travel as a value.
- `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` make weak assumptions more visible.

### Rust

- Enums with payloads, structs with private fields, exhaustive `match`, and `TryFrom`/`FromStr` provide strong support.
- Replace `unwrap` or indexing only where failure is not a legitimate runtime outcome. Otherwise return `Option`/`Result`.
- Audit `serde` construction paths and public fields; deriving deserialization can bypass a hand-written smart constructor unless configured carefully.

### Scala

- Use enums or sealed traits with case classes and compiler-supported exhaustive matching.
- Opaque types and smart constructors work for validated primitives; keep validation at the companion/boundary.
- Prefer ordinary algebraic data types before advanced match, refinement, or dependent features.

### Java and Kotlin

- Use sealed interfaces/classes plus records/data classes for variants.
- Keep constructors private when a factory establishes an invariant.
- Pattern-match exhaustively where the language/version supports it; avoid a default that hides new variants.

### Python

- Dataclasses, unions, `Literal`, Pydantic models, and `assert_never` improve structure, but runtime construction and monkey-patching make guarantees weaker.
- Use runtime parsers at boundaries and strict static checking where practical.
- Do not claim a `NewType` or type annotation validates values at runtime.

### Go

- Use unexported fields and constructor functions for closed construction within a package.
- Interfaces can approximate sums with unexported marker methods, but type switches are not compiler-checked for exhaustiveness.
- Zero values, composite literals inside the package, reflection, and decoding paths can reopen invalid states. Test these paths and state the residual guarantee honestly.
- Generic receiver tricks do not provide full typestate method restriction; prefer clear runtime transitions or separate concrete state types when needed.

## Review distinctions

Label findings precisely:

- **Correctness:** a representable input reaches panic, impossible branch, inconsistent state, or partial effect.
- **Boundary loss:** parsing/validation learns a fact but returns the original weak representation.
- **Exhaustiveness:** adding a variant can bypass a consumer without compiler/lint failure.
- **Ergonomics:** wrappers or names could prevent confusion but no invalid state currently reaches a partial operation.
- **Over-modeling:** precision, wrappers, or advanced machinery eliminate no required branch and impose visible cost.
