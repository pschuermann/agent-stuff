# Apply Constructive Type Design

Use this sequential workflow for design, implementation, refactoring, and review. Respect the user’s requested scope: a review remains read-only, and design-only work stops before edits.

## Phase 1: Establish the contract and local conventions

**Entry:** The user has identified code, behavior, or a design problem involving typed data.

**Actions:**

1. Inspect the relevant implementation, public signatures, callers, tests, schemas, and project typechecking/lint configuration. Start locally; expand only when the value crosses additional modules.
2. Identify the producers of the value, the consumers that interpret it, and any external boundary it crosses.
3. Separate three kinds of failure:
   - malformed or untrusted external input;
   - an internally illegal state the representation currently permits;
   - an expected operational failure such as not-found, conflict, timeout, or permission denial.
4. Note the project’s existing idioms for sums, products, options/results, parsers, constructors, and exhaustive matching. Reuse them unless they cause the problem.

**Exit:** The target behavior, relevant producer-to-consumer path, failure category, and project conventions are understood from code or authoritative documentation rather than guessed.

## Phase 2: Build the obligation ledger

**Entry:** Phase 1 exit criteria are met.

**Actions:**

1. Search the relevant path for partiality signals in one pass where practical: panic/throw/unwrap, non-null assertion, unchecked cast, incomplete match, repeated validation, coupled optionals, boolean state flags, and “impossible” comments.
2. For each meaningful candidate, record:

   | Consumer operation | Weak input admitted | Current failure/branch | Fact needed | Producer or boundary able to establish it |
   |---|---|---|---|---|

3. Distinguish correctness obligations from ergonomic speed bumps. Distinct ID/unit types can prevent accidental swaps, but do not claim they eliminate a previously partial operation unless they actually do.
4. Remove candidates where every input already has a sensible result and no invariant-dependent branch exists. For example, summing an empty collection normally remains total.
5. Prioritize the smallest number of changes that remove concrete partial behavior. Do not turn a local issue into a domain-wide type redesign without evidence and user scope.

**Exit:** At least one concrete obligation justifies a design change, or the workflow has concluded that the simpler existing type should remain. If no obligation remains, explain that judgment and stop.

## Phase 3: Choose the simplest constructive representation

**Entry:** The obligation ledger contains at least one justified candidate.

**Actions:**

1. Write the consumer signature and behavior you wish were possible without panic or impossible handling.
2. Try representations in this order:
   1. product and sum types with exhaustive matching;
   2. an alternate constructive representation such as head-plus-tail, list-of-pairs, start-plus-duration, or a map;
   3. moving optionality or failure to the caller best equipped to decide;
   4. a private/opaque type with a smart constructor when a direct construction is impractical;
   5. refinement, dependent, branded, or typestate machinery when it materially improves enforcement or ergonomics.
3. Compare viable choices against:
   - required operations becoming total;
   - construction and access ergonomics;
   - reuse of standard library and ecosystem APIs;
   - conversion and migration cost;
   - performance and representation cost;
   - mutability or escape hatches that could invalidate the proof.
4. Keep the weakest sufficient type. Do not encode facts no consumer needs merely because the type system can express them.
5. Decide where conversion belongs. Prefer the earliest boundary that has enough context to report the error correctly, before effects act on incompletely parsed input. Authorization or resource limits may legitimately precede expensive parsing.

**Exit:** A before/after signature, chosen representation, conversion boundary, and rejected alternatives are clear. The design names the partial case it removes.

## Phase 4: Propagate and implement

**Entry:** Phase 3 exit criteria are met and the user requested code changes. For design or review requests, adapt the actions into a proposal or findings and do not edit.

**Actions:**

1. Change the consumer toward the desired total signature first.
2. Follow type errors toward producers. Update each call site by supplying the stronger value, handling an honest failure, or preserving compatibility through a narrow adapter.
3. Parse unstructured input once at the selected boundary. Return the structured value; do not perform a check and continue passing the original weak value.
4. Make construction closed enough to support the claimed guarantee:
   - keep fields/constructors private or unexported where the language permits;
   - expose invariant-preserving operations;
   - prevent deserialization, mutation, default values, reflection, or casts from silently bypassing construction where relevant.
5. Use exhaustive matching without a catch-all that hides newly added variants. If the language cannot prove exhaustiveness, add its established `assertNever`, sealed marker, or lint pattern and describe the residual limit honestly.
6. Avoid parallel representations of the same fact. Derive booleans and secondary values where practical; encapsulate unavoidable denormalization in one trusted module.
7. Add comments only for design intent that cannot be inferred from the code, such as why this representation preserves an invariant or why a weaker type is deliberately retained.
8. Keep the edit bounded. Do not introduce an application-wide abstraction when a fit-for-purpose local type is clearer.

**Exit:** The changed path uses the new representation from construction to consumption, compiles or typechecks, and introduces no unexplained cast, assertion, duplicate validation, or catch-all match.

## Phase 5: Verify the guarantee and proportionality

**Entry:** A design proposal, review, or implementation is complete.

**Actions:**

1. Run the project’s formatter, typechecker/compiler, focused tests, and relevant lint checks. Record exact failures rather than claiming success from inspection.
2. For smart constructors or boundary parsers, verify at least:
   - representative valid input constructs the strong type;
   - invalid and boundary inputs fail without partial effects;
   - successful values can be consumed without revalidation;
   - public mutation or transitions preserve the invariant.
3. Use property-based tests when the input space is broad and the project already supports them, or when the risk warrants adding them. Read the `property-based-testing` or `robust-testing` skill when available instead of inventing weak random tests.
4. When practical, briefly weaken or bypass the check and confirm the relevant test or compiler gate fails, then revert the mutation.
5. Re-read the obligation ledger:
   - Did the intended panic or impossible branch disappear?
   - Did the obligation move to a boundary that can actually decide?
   - Did the change add precision no consumer uses?
   - Did a trusted constructor, unsafe cast, catch-all, zero value, deserializer, or mutation path reopen the state?
6. Report residual limits. Dynamic languages, open interfaces, unchecked deserializers, and public fields provide weaker guarantees than closed algebraic data types; do not overstate them.

**Exit:** Verification evidence supports the claimed guarantee, excess precision has been removed, and remaining partial operations or trusted surfaces are explicit. If checks cannot run, report the blocker and the exact unverified claim.
