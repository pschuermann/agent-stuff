# LLM-Assisted Property Discovery

Read this when an agent is being asked to invent, improve, or repair property
tests. LLMs can help, but the failure mode is severe: they invent plausible
properties that the system never promised. Treat property discovery as an
evidence-gathering workflow, not a creativity prompt.

**Maturity:** emerging. Use this workflow to reduce hallucinated properties and
to structure agent help, but do not treat LLM-generated properties as trustworthy
until each one is grounded in evidence and reviewed through failures.

## What recent work supports

The useful pattern is an evidence loop: gather docs/callers/schemas/traces,
synthesize candidate properties, run them, and refine or discard over-claims.
Some recent systems split roles further: one agent writes or repairs code while a
separate tester agent proposes properties and turns failures into semantic
feedback. The practical rule is the same either way: do not let the same
unsupported guess serve as both implementation and oracle.

## The rule

**Evidence before properties.** A candidate property must be supported by at
least one of:

- public docs/specs;
- type signatures and explicit contracts;
- caller behavior and integration expectations;
- schemas/OpenAPI/protocol definitions;
- known mathematical/physical law;
- execution traces that show stable intended behavior;
- a human-confirmed product requirement.

If the evidence is weak, label it as a question or exploratory check. Do not
turn it into a failing test that blocks the build.

## Workflow

1. **Inventory the contract surface.** Read docs, public API, schemas, examples,
   call sites, and existing tests.
2. **Explore behavior.** Run small traces/examples through the public API and
   observe outputs, side effects, and error behavior.
3. **Synthesize candidates.** For each property, write down the evidence source:
   "docs say X", "callers rely on Y", "OpenAPI marks Z required", "all traces
   show A after B".
4. **Classify candidates.** Use `supported`, `question`, or `reject`. Only
   `supported` becomes an automated test.
5. **Generate valid inputs.** Prefer sound generators over broad ones. A failure
   outside the documented domain usually means the generator is wrong.
6. **Run and refine.** If a property fails, first ask whether the property or
   generator is over-claiming. Then debug the implementation.
7. **Feed back minimal counterexamples.** When an agent repairs code, provide the
   violated property, minimized input/trace, seed, and observed-vs-expected
   relation. Avoid vague "tests failed" feedback.

## Good uses for an LLM agent

- Mine call sites for implicit preconditions and postconditions.
- Turn OpenAPI/schema/docs into candidate metamorphic relations.
- Write structured generators from examples and grammars.
- Explore a UI/API to collect traces before proposing workflow properties.
- Convert a natural-language requirement into partial properties, then validate
  them against public examples or known-good traces.
- Propose domain property catalogs to inspect.
- Explain a shrunk counterexample and suggest the likely contract boundary.
- Improve a generator based on coverage/distribution gaps.

## Bad uses

- "Invent robust properties for this function" with no docs/callers/examples.
- Asserting that names imply full behavior (`ThingMap` must satisfy every map
  law) when maintainers intentionally exposed a narrower contract.
- Using another LLM response as the oracle.
- Letting the code-writing agent and test-writing agent share the same
  unvalidated interpretation of the spec.
- Reporting every generated-property failure as a product bug.
- Fixing production code before validating that the property is actually true.

## Review checklist for generated properties

Before accepting an LLM-generated property, require:

- **Evidence link:** exact doc line, schema field, caller behavior, trace, or
  human requirement that supports it.
- **Domain statement:** the valid input/state region where the property applies.
- **Counterexample policy:** what failure would mean: implementation bug,
  generator bug, ambiguous spec, or product question.
- **Oracle independence:** why the property is not just the implementation's
  logic restated in test code.
- **Sensitivity check:** a plausible broken implementation or manual mutation
  that the property would reject.

## Sources

For citations and research trail, see `resources.md`. Do not load sources just
to write tests; load them only when the user asks for research, citations, or
background.
