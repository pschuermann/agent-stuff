# Structured Fuzzing

Read this for parsers, codecs, serializers, compilers, interpreters, file
formats, network protocols, CLIs, DSLs, REST/GraphQL APIs, and any system where
pure random bytes are rejected before they reach interesting code.

## Why raw bytes fail

Most structured systems have a narrow validity funnel: magic bytes, checksums,
headers, grammar, schema, semantic constraints, and cross-field dependencies. A
byte fuzzer that never passes the first parse branch is not testing the real
implementation. Generate inputs that are valid enough to go deep, then corrupt,
splice, mutate, and minimize them.

**Maturity:** structured/grammar/schema-aware fuzzing is proven. Agent-generated
generators are emerging; use coverage, sanitizer findings, and semantic
properties to judge them before trusting them.

## The ladder

Climb only as far as the target needs.

1. **Seed corpus:** collect small valid examples, edge examples, real-world
   fixtures, regression files, and minimal malformed cases. Keep them in version
   control when reasonable.
2. **Dictionary tokens:** feed the fuzzer keywords, delimiters, magic strings,
   option names, status codes, protocol verbs, and boundary constants.
3. **Valid-then-mutate:** generate valid inputs, then flip bits/bytes, delete
   chunks, duplicate fields, truncate, swap sections, or crossover two valid
   examples.
4. **Grammar/schema generation:** use EBNF/ANTLR/PEG grammars, JSON Schema,
   OpenAPI, GraphQL schemas, Protobuf/Avro/Thrift definitions, SQL/AST
   generators, or type-derived generators.
5. **Semantic generators:** construct values that satisfy cross-field rules:
   lengths match payloads, checksums match bytes, references point to existing
   IDs, date ranges are ordered, ASTs are well typed.
6. **Coverage-guided fuzzing:** use libFuzzer/AFL++, Go native fuzzing, Atheris,
   cargo-fuzz, Jazzer, OSS-Fuzz, or a language-native equivalent when crashes,
   sanitizer findings, or deep parser paths matter.
7. **Agent-assisted generator synthesis (emerging):** ask an agent to write or
   improve a target-specific generator from source, docs, schemas, and examples,
   then measure branch/predicate/state coverage and iterate. The measurement is
   the guardrail; the agent's generator is not credible until it reaches deeper
   code.

## Assertions that actually check semantics

Pair structured fuzzing with real properties:

- `parse(pretty(parse(x)))` preserves the AST or canonical form.
- `decode(encode(x)) == x` for supported values.
- `normalize(normalize(x)) == normalize(x)`.
- A strict parser rejects malformed variants with documented errors, not panics
  or partial silent success.
- Two independent parsers/versions agree after canonicalization.
- For compilers/interpreters, semantics-preserving rewrites produce equivalent
  outputs.
- For APIs, schema-valid requests satisfy status-code, auth, pagination,
  idempotence, and monotonicity properties.

"Does not crash" is only the floor. It is useful under sanitizers, but it is too
weak for semantic correctness.

## Fuzz drivers

The driver is often harder than the input. Build it through the public API, not
private helpers, and borrow realistic call sequences from consumer code. A good
driver:

- creates an isolated fixture/temp directory/database/tenant;
- feeds generated input through the same entry point real users hit;
- checks invariants immediately after parse/execute/serialize;
- prints the seed, corpus path, and minimized reproducer;
- has a small local run and a long fuzz target.

## LLM-specific guidance

Recent 2026 work is converging on this rule: use LLMs to synthesize *generators
and drivers*, then use instrumentation to judge them. Do not replace coverage,
sanitizers, or semantic properties with "the model says this input is good."

Give the agent:

- target source and public docs;
- seed examples and schemas;
- the current coverage/predicate gaps;
- permission to run the fuzzer briefly and revise the generator.

Reject generator changes that only make inputs look realistic but do not improve
deep-state coverage or property failures.

## Sources

- The Fuzzing Book (https://www.fuzzingbook.org/), especially "Fuzzing with
  Grammars" and generator chapters.
- LLAMAFUZZ (AST 2026 / https://arxiv.org/abs/2406.07714): LLM-enhanced
  greybox fuzzing for structured data via structure-preserving mutation.
- "Fuzzing with Agents? Generators Are All You Need"
  (https://arxiv.org/abs/2604.01442): agents synthesize target-specific
  generators and iterate with coverage feedback.
- "Prompt Fuzzing for Fuzz Driver Generation" (https://arxiv.org/abs/2312.17677):
  fuzz-driver generation tradeoffs.
- Go native fuzzing, Atheris, cargo-fuzz, Jazzer, libFuzzer/AFL++, OSS-Fuzz.
