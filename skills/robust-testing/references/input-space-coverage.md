# Input-Space and Combinatorial Coverage

Read this when bugs are likely to depend on combinations of finite options:
feature flags, permissions, roles, tenants, locales, currencies, browser/device
matrices, auth modes, storage backends, cache settings, API options, build
profiles, deployment configs, plugins, or compatibility modes.

**Maturity:** covering arrays and t-way combinatorial testing are proven for
finite option/configuration spaces. Variability-aware greybox fuzzing is newer;
use it as an advanced extension when configuration controls deep behavior.

## The distinction

Line coverage asks which code ran. Property testing asks which generated states
were checked. **Input-space coverage** asks which combinations of named factors
the test suite actually covered.

For a finite factor model, random sampling is often wasteful and uneven. A
covering array gives deliberate t-way coverage: every pair/triple/etc. of factor
values appears in at least one test, subject to constraints.

NIST's long-running result is the practical reason this matters: many real
software failures are triggered by interactions of only a few variables, often
within 1 to 6 factors. You do not need the full Cartesian product to get useful
coverage.

## When to use it

Use combinatorial testing when:

- the factors and values are enumerable;
- constraints can be stated ("Safari does not support feature X", "guest cannot
  use admin endpoint");
- failures plausibly depend on interactions between settings;
- the Cartesian product is too large but pairwise/triple-wise is feasible;
- existing tests are hand-picked and probably miss important combinations.

Prefer property/random generation when the space is structural or unbounded:
arbitrary ASTs, nested JSON, long operation traces, huge data values. Combine
the two when both matter: pick configurations by covering array, then run a
property/fuzz harness inside each selected configuration.

## Workflow

1. **List factors and values.** Keep the list domain-shaped: role, auth mode,
   locale, storage backend, clock/time-zone mode, feature flags, browser, API
   version, etc.
2. **State constraints.** Invalid combinations should be excluded by the model,
   not rejected at runtime after wasting test budget.
3. **Generate t-way cases.** Start with pairwise. Move to 3-way or higher for
   high-risk areas or when postmortems show higher-order failures.
4. **Attach properties, not snapshots.** Each generated row should drive a real
   invariant: access monotonicity, round-trip, idempotence, no tenant leakage,
   no unsupported feature exposure, same semantic result across backends.
5. **Measure existing coverage.** Before adding hundreds of tests, check which
   pair/triple combinations your current suite already covers.
6. **Use sequence coverage for event workflows.** When order matters, cover
   short event subsequences instead of only static factor combinations.

## Variability-aware fuzzing

For configurable systems where configuration changes control flow, treat
configuration as part of the fuzz input. Modern variability-aware fuzzing tracks
coverage and crashes across both data seeds and presence conditions/configs. In
practical terms:

- vary configuration deliberately, not as a single fixed CI environment;
- record which config found the failure;
- keep corpus entries tied to the config assumptions they require;
- avoid "one blessed config" test suites for libraries meant to support many
  deployment modes.

## Tools

- **NIST ACTS / CAGen / covering-array libraries:** t-way covering arrays and
  coverage measurement.
- **PICT / allpairspy / pairwise generators:** pragmatic pairwise generation for
  smaller project-level matrices.
- **Project-native parametrization:** pytest parametrization, JUnit parameterized
  tests, vitest table tests, etc. are fine once the rows come from a real factor
  model.

## Sources

- NIST Automated Combinatorial Testing for Software
  (https://csrc.nist.gov/projects/automated-combinatorial-testing-for-software):
  ACTS, covering arrays, sequence covering arrays, and input-space coverage
  measurement.
- VAFuzz, "Variability-Aware Fuzzing" (ICSE 2026): configuration-space-aware
  greybox fuzzing.
- ECFuzz / configuration fuzzing work for large-scale systems.
