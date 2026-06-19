# Metamorphic Testing

Read this when there is no reliable oracle for a single execution: LLM/ML/NLP
behavior, search/ranking, REST APIs, compilers, optimizers, IaC/resource graphs,
graphics, simulations, scientific/numeric code, lossy transforms, and APIs where
the spec describes relations more clearly than exact outputs.

## The shape

Metamorphic testing turns relations between executions into the oracle:

```
x  = generated source input
x' = transform(x)
y  = system(x)
y' = system(x')
assert output_relation(y, y')
```

The relation is the test. It must be justified by the spec, docs, callers,
physics/math, schema, or observed contract. Do not assert a relation just because
it sounds natural.

## Relation catalogue

Use several relations. A single metamorphic relation is usually too weak.

- **Preservation under irrelevant change:** whitespace, comments, casing, prompt
  formatting, variable names, field order, resource declaration order, or other
  syntax-preserving rewrites should not change observable semantics.
- **Permutation / order independence:** shuffling independent inserts, filters,
  rules, records, or statements should preserve the result or produce an
  equivalent result after canonicalization.
- **Monotonic / subset relations:** adding a filter cannot increase a result
  set; reducing permissions cannot reveal more data; narrowing a time range
  cannot produce events outside that range.
- **Split / merge / decomposition:** processing all data at once should match
  processing chunks and recombining, within the system's documented semantics.
- **Round-trip / inverse:** serialize/deserialize, apply/undo, migrate/rollback,
  encode/decode, normalize/parse/pretty-print/parse.
- **Idempotence and retry:** repeating a safe operation, replaying an at-least-once
  message, or retrying after a timeout should not duplicate effects.
- **Differential metamorphism:** two independent implementations, API versions,
  database engines, or optimization levels should agree on semantic results even
  if their internal outputs differ.
- **Numeric / lossy tolerance:** outputs should stay within an error metric,
  not byte-identical, for compression, image/audio codecs, ML scores, and
  floating-point algorithms.

## LLM and NLP systems

For LLM-backed behavior, avoid single golden answers. Prefer relations such as:

- meaning-preserving paraphrase should preserve classification/intent/entity
  extraction;
- irrelevant context should not change an answer to a grounded question;
- output format constraints should survive prompt wording changes;
- adding stronger safety constraints should not make unsafe output more likely;
- equivalent tool results should lead to equivalent final decisions.

Use statistical/tolerance checks when the system is intentionally stochastic, and
verify flagged failures independently. For NLP tasks, prefer task-specific
relations from a catalog over generic "same answer" checks.

## REST and web APIs

OpenAPI/docs often imply metamorphic API scenarios:

- `GET` pagination concatenated across pages equals the unpaginated or larger-page
  result, if the API promises stable ordering.
- Sorting ascending then reversing equals sorting descending.
- Field projection is a subset of the full response.
- `PUT`/upsert is idempotent; repeated `DELETE` has the documented not-found/no-op
  behavior.
- Creating through one endpoint and reading through another yields equivalent
  resource state.
- More restrictive auth/tenant scope cannot reveal more resources.

LLM agents can help propose these scenarios from OpenAPI, but require a human or
an independent verifier for ambiguous business semantics.

## Guardrails

- **Validate the relation first.** A false metamorphic relation is just a false
  oracle. Label uncertain relations as questions, not tests.
- **Canonicalize before comparing.** Sort maps, normalize timestamps/time zones,
  compare resource graphs semantically, and separate structural equality from
  observable equality.
- **Combine relations with examples.** A relation can miss shared misconceptions;
  pin a few known spec examples or physical/math invariants.
- **Record the source and follow-up input.** A failure needs both executions, the
  transform, seed, and any stochastic settings to be reproducible.

## Sources

- LLMORPH, "Automated Metamorphic Testing of Large Language Models"
  (https://arxiv.org/abs/2603.23611): applies 36 metamorphic relations across
  NLP benchmarks.
- "Metamorphic Testing of Large Language Models for Natural Language Processing"
  (https://arxiv.org/abs/2511.02108): catalogs 191 NLP metamorphic relations
  across 24 tasks.
- ARMeta, "Multi-Agent LLM-based Metamorphic Testing for REST APIs"
  (https://arxiv.org/abs/2605.28321): derives OpenAPI-based Given-When-Then
  metamorphic scenarios.
- "Metamorphic Testing for Infrastructure-as-Code Engines" (OOPSLA 2026):
  semantic equivalence over resource graphs for IaC engines.
- Hillel Wayne, "Metamorphic Testing"
  (https://www.hillelwayne.com/post/metamorphic-testing/): practical no-oracle
  examples.
