# Frameworks: the property-based & fuzzing libraries

The techniques in this skill aren't tied to a language, but each ecosystem has a
specific library that implements them natively — and the default instinct is to
*not* use it. Left alone, the model writes example-based unit tests in the
standard runner (pytest, vitest, `go test`, xUnit). This file names the library
that actually does fuzz + invariant + swarm testing in each stack, and the exact
entry point for the pattern that matters most.

**The key idiom to look for in every framework: model-based / stateful testing.**
That's the framework-native name for the skill's workhorse — generate a random
*sequence of operations* through the public API, run them against the real system
**and** a simple reference model in lockstep, and assert they agree plus
invariants hold. These libraries also give two things antirez does by hand for
free: **automatic shrinking** (a failure is minimized to the smallest reproducing
case) and a **persisted seed/counterexample** for replay. Swarm testing maps
cleanly onto them too — randomize *which* commands/rules are eligible per run.

(Mutation-testing tools per language live in `mutation-testing.md`, not here.)

## Python — Hypothesis (+ Atheris)

- **Property tests:** `@given(strategies...)` over `hypothesis.strategies`.
- **The stateful pattern (use this for any container/API):**
  `hypothesis.stateful.RuleBasedStateMachine` with `@rule` (operations),
  `@invariant` (checked after every step), and `Bundle` (thread outputs of one
  rule into another). This *is* the random-ops-through-the-API harness, with
  shrinking built in — keep a plain reference (e.g. a `dict`) as a field and
  assert agreement inside the rules/invariants.
- **Boundary probing:** pin exact edge cases with `@example(...)` so they run
  every time alongside the generated ones; bias generators with
  `.filter()`/`.map()`/`st.composite`.
- **Swarm:** parametrize which rules are enabled per run, or gate rules behind a
  per-run random subset.
- **Coverage-guided / binary fuzzing (parsers, decoders):** Atheris (libFuzzer
  for Python) — assert round-trip / no-crash invariants in the fuzz target.

## TypeScript / React — fast-check

- **Property tests:** `fc.assert(fc.property(arbitraries, predicate))`; runs
  inside vitest or jest with no extra runner. Rich arbitraries + automatic
  shrinking.
- **The stateful pattern:** `fc.commands` + `fc.modelRun` — define command
  objects with `check`/`run` against a real instance and a model object, and
  fast-check generates random valid command sequences and shrinks failures. This
  is the model-in-lockstep harness.
- **React specifically:** point property/model-based tests at the *pure logic* —
  reducers, state machines, selectors, form/validation logic — where this style
  pays off most. Leave rendering to Testing Library; don't try to fuzz the DOM.
- **Boundary probing:** `fc.constantFrom(...)` / custom arbitraries to force
  exact edge values into the sample.
- **Swarm:** randomly restrict the command set (or arbitrary weights) per run.

## Go — native fuzzing + rapid

- **Coverage-guided fuzzing (built in, prefer it for parsers/codecs):**
  `func FuzzX(f *testing.F)` with `f.Add(seed...)` for the seed corpus and
  `f.Fuzz(func(t *testing.T, b []byte){ ... })`; run with `go test -fuzz=FuzzX`.
  Assert round-trip / invariant / no-panic inside the body. The corpus persists,
  so found crashes become permanent regression cases.
- **Property + stateful:** `pgregory.net/rapid` — modern property-based testing
  with shrinking and **state-machine testing** (random method sequences against a
  struct), the idiomatic way to do the random-ops-vs-reference harness in Go.
- **Lightweight option:** the stdlib `testing/quick` (`quick.Check`) exists but
  has no shrinking and is largely superseded by rapid for serious use.
- **Swarm:** randomize the eligible action set inside the state machine per run.

## .NET (C#) — CsCheck or FsCheck

- **CsCheck** (C#-first; recommended for new C# work): property-based plus
  **model-based testing** (random ops against a real + model object),
  metamorphic testing, **concurrency testing**, strong shrinking, and
  sampling/perf helpers. Sits on top of xUnit/NUnit.
- **FsCheck** (the established choice, F# origin, full C# support): property tests
  via `[Property]` (FsCheck.Xunit) and model/command-based testing for the
  stateful pattern.
- **The stateful pattern:** use the model-based/command API of whichever you pick
  — random command sequences against the system and a reference model, asserting
  agreement + invariants, with automatic shrinking.
- **Swarm:** vary the set of generated commands per run.

## Rust — proptest / arbitrary / cargo-fuzz / Shuttle

- **Property tests:** `proptest` is the default serious choice; use strategies to
  construct valid values, `prop_compose!` for custom generators, and regression
  files for persisted counterexamples. `quickcheck` exists but is lighter.
- **Structured/binary fuzzing:** `cargo-fuzz` (libFuzzer) plus `arbitrary` for
  deriving structured inputs from byte streams. Pair with round-trip,
  canonicalization, and differential properties, not only no-panic checks.
- **Stateful/concurrent:** model the state explicitly in `proptest`, and use
  `loom` or AWS `shuttle` when the thing under test is an interleaving rather
  than an input.
- **Swarm:** randomize which operations are eligible in each generated command
  sequence.

## JVM — jqwik / QuickTheories / JUnit-Quickcheck / Jazzer

- **Property tests:** `jqwik` is the most complete modern Java option, with
  generators, shrinking, lifecycle hooks, and statistics/coverage checks.
  QuickTheories is also viable for simpler property tests.
- **Model/stateful:** encode commands against a real object plus a reference
  model; in Kotlin/Scala, also consider Kotest property testing or ScalaCheck.
- **Coverage-guided fuzzing:** Jazzer brings libFuzzer-style fuzzing to JVM code;
  use it for parsers, deserializers, and security-sensitive inputs.
- **REST/API:** Schemathesis/EvoMaster-style schema-aware testing is often a
  better fit than hand-written examples when OpenAPI is available.

## API / schema-first systems

- **OpenAPI/REST:** Schemathesis generates requests from OpenAPI and checks
  schema/status-code invariants; EvoMaster is strong when deeper API exploration
  and generated scenarios matter.
- **GraphQL:** generate queries/mutations from the schema, then assert auth,
  nullability, pagination, idempotence, and cross-endpoint consistency.
- **Protobuf/Avro/Thrift:** derive structured values from the schema, then test
  round-trip, forward/backward compatibility, unknown-field preservation, and
  cross-language implementation agreement.
- **Metamorphic API relations:** pagination, sorting, field projection,
  idempotent PUT/DELETE, tenant/auth monotonicity, and create/read/update
  consistency belong in `metamorphic-testing.md`.

## Cross-cutting power features the model forgets

Beyond `@given`/`fc.property` + a plain assert, every mature framework ships
capabilities that change *how* you test — and that the model essentially never
reaches for by default. Pull these in; they're high-leverage.

- **Distribution / coverage checking — prove the generator hits the cases you
  care about.** The antidote to "fuzzing finds nothing": measure, and even
  *enforce*, which states you actually reach.
  - Python: `event(...)` + `pytest --hypothesis-show-statistics`.
  - TS: `fc.statistics(arb, classify, {numRuns})`.
  - Java: `Statistics.collect(...)` / `@StatisticsReport`, and
    `Statistics.coverage(c -> c.check(v).percentage(p -> p > 20.0))` which
    *fails the test* if a case is under-represented.
  - Haskell: `collect`/`label`/`classify` to report; `cover` + `checkCoverage`
    (QuickCheck) or `cover` + `withConfidence` (Hedgehog) to make adequate
    coverage a statistically-sound hard requirement.
  See `pbt-craft.md` for why this matters and how to use it.
- **Targeted search — hill-climb toward the extremes.** `hypothesis.target(metric)`
  steers generation to maximize a value (max depth, worst-case time, largest
  allocation) instead of hoping a random run reaches it. The framework-native way
  to honor "push N to the limits." (Originated in PropEr's targeted testing.)
- **The failure-example database — automatic regression replay.** Hypothesis
  persists minimized failing examples to `.hypothesis/examples/` and replays them
  first on the next run; cache that directory in CI. Frameworks without a DB
  print a seed (fast-check also a `path`) — log it on every failure.
- **Async / concurrency scheduling — generate the interleaving.** fast-check
  `fc.scheduler()` / `scheduledModelRun` deterministically permute promise
  resolution to surface and shrink race conditions; PropEr `parallel_commands`
  is the Erlang ancestor. The bridge to deterministic simulation testing — see
  `deterministic-simulation-testing.md`.
- **Pin boundary/known cases that always run:** `@example` (Hypothesis),
  `examples:` (fast-check), `f.Add` seed corpus (Go), edge-case modes (jqwik).

## Technique → framework feature, at a glance

| Skill technique | Python | TS/React | Go | .NET |
|---|---|---|---|---|
| Random ops + reference in lockstep | `RuleBasedStateMachine` | `fc.commands`/`modelRun` | rapid state machine | CsCheck/FsCheck model-based |
| Property over generated inputs | `@given` | `fc.property` | rapid / `testing/quick` | `[Property]` |
| Coverage-guided byte fuzzing | Atheris | (use a Node fuzzer / libFuzzer) | `go test -fuzz` (native) | SharpFuzz |
| Pin boundary cases | `@example` | `examples:` | seed corpus `f.Add` | explicit gen/config |
| Automatic shrinking + seed replay | built in | built in | built in (rapid/native) | built in |
| Distribution / coverage checking | `event` + `--show-statistics` | `fc.statistics` | `Statistics.coverage` | `cover`/`classify`/`collect` |
| Targeted / guided search | `target()` | — | — | (PropEr `target`) |
| Failure-example database | `.hypothesis/` (auto) | seed + `path` | seed | seed |
| Async / race scheduling | — | `fc.scheduler` | — | (PropEr `parallel_commands`) |

When you write tests in one of these stacks, **reach for the model-based API
first** for anything stateful — it gives you the whole harness (generation,
lockstep, shrinking, replay) instead of hand-rolling it.

For Rust/JVM/API-schema stacks, use the ecosystem sections above rather than the
compact table; the exact best tool depends more heavily on whether you are doing
PBT, coverage-guided fuzzing, concurrency testing, or schema-driven API testing.
