# Temporal Workflow Testing

Read this for UI workflows, event-driven systems, stream processing, trigger-action
rules, queues, reactive apps, long-running agents, schedulers, and anything where
the bug lives in the sequence of events rather than one input/output pair.

**Maturity:** temporal properties are a proven specification idea, and
state-machine workflow testing is practical. LTL-style acceptance tools such as
Quickstrom are specialized; use the pattern broadly, but reach for the tool only
when workflow traces are central enough to justify it.

## Think in traces

A normal unit test says "given this input, expect this output." A temporal
property says something about an event trace:

- **Safety:** something bad never happens.
- **Liveness:** something good eventually happens.
- **Ordering:** B cannot happen before A.
- **Response:** whenever A happens, B must eventually follow.
- **Until:** C remains true until D happens.
- **Persistence:** after save/reload/restart, the promised state is still true.

This is the same mental model as deterministic simulation's `always` and
`sometimes`, but it applies to product workflows too.

## Property examples

- After a user saves a draft, the draft eventually appears in the list and still
  appears after reload.
- Once an item is deleted and the deletion is acknowledged, it never reappears
  after refresh, pagination, or sync.
- Checkout cannot charge before confirmation.
- A progress indicator eventually resolves or presents a retry/error state; it
  does not spin forever.
- A trigger-action rule fires only after its trigger and never more than once per
  documented event.
- Stream output preserves event-time ordering guarantees and watermark behavior.
- An agent must not perform an irreversible action before receiving the required
  confirmation/tool result.

## How to implement it

- **Use a model/state machine** for allowed actions and expected abstract state.
  fast-check commands, Hypothesis state machines, Playwright + a small model, or
  a custom seeded harness can all work.
- **Record traces.** Log action, observed UI/API state, timestamps/logical time,
  seed, and enough IDs to replay.
- **Use virtual clocks where possible.** Avoid sleeping in tests. Advance time
  deliberately so timeouts, retries, debounces, and scheduled jobs are reachable.
- **Assert at the semantic layer.** Prefer domain state and accessibility-visible
  UI over screenshots and brittle CSS selectors.
- **Cap and replay.** Bound action count for local/PR runs, print the seed, and
  promote minimized traces to regression tests.

## When to use LTL-style tools

Linear temporal logic is useful when the property is naturally "always",
"eventually", "until", or "after A then eventually B." Quickstrom applies this
idea to web acceptance testing: specify behavior in a testing-oriented LTL
dialect and let the tool generate user interactions against the app.

You do not need a full LTL tool to steal the pattern. A normal stateful test can
accumulate a trace and assert:

- every prefix satisfies safety;
- every request has a matching response by the end of the trace;
- every generated workflow reaches at least one meaningful terminal state.

## Guardrails

- Do not fuzz a shared user account, mailbox, database, or real payment system.
  Temporal tests create and delete aggressively.
- Separate flakiness from real nondeterminism: use virtual time, stable test
  IDs, isolated resources, and replayable seeds.
- Avoid over-specifying UI choreography. Assert the workflow contract, not that a
  spinner appears for exactly one frame.

## Sources

- Quickstrom, "Property-based acceptance testing with LTL specifications" (PLDI
  2022 / https://arxiv.org/abs/2203.11532).
- "Temporal Specification Oriented Fuzzing for Trigger-Action Programming Smart
  Home Interactions" (ICSE 2026).
- "Property-Based Testing for Spark Streaming" (https://arxiv.org/abs/1812.11838):
  temporal properties for stream processing.
- PropRatt, "Property-Based Testing for Asynchronous Functional Reactive
  Programming Using Linear Temporal Logic" (PADL 2026).
