# Testing

Tests are evidence of observable behavior, in addition to static verification.

## Required commands

```text
pnpm check:all
```

The command runs runtime preflight, formatting, package API checks, type checking,
linting,
enforcement fixtures, dead-code analysis, architecture checks, package hygiene,
coverage-enabled unit tests, and zero-warning enforcement.

## Test levels

- Unit tests cover pure logic, transformations, edge cases, and deterministic
  state transitions.
- Integration tests cover interactions between real application modules and
  infrastructure boundaries.
- End-to-end tests cover critical user-visible workflows that lower levels do
  not adequately demonstrate.

Do not replace cheap unit or integration evidence with end-to-end tests.

## Evidence by change

| Change                   | Required evidence                                                         |
| ------------------------ | ------------------------------------------------------------------------- |
| Pure domain logic        | Unit tests, boundary cases, and mutation or equivalent red-state evidence |
| Infrastructure adapter   | Integration or contract tests against the real adapter boundary           |
| UI behavior              | Component tests with accessibility assertions                             |
| Critical workflow        | End-to-end test of the user-visible workflow                              |
| Bug fix                  | Regression test that fails on the prior implementation                    |
| Configuration or tooling | Positive and negative enforcement fixtures                                |

## Test behavior, not implementation

Use given/when/then behavior and externally observable results. Prefer accessible
roles, labels, and visible content in React tests. Avoid assertions on class
names, incidental DOM structure, private state, or mock call choreography.

Bug fixes should normally include a regression test that exercises the failure
mechanism.

## Proof that a test can fail

Every new test must have a demonstrated failure mode. Before considering the
test complete, actively break the assumption it is meant to protect and confirm
that the test fails for that reason. The change may be temporary and must not be
committed.

Examples:

- remove the validation branch the test protects;
- return the wrong value from the use case;
- remove the accessible label the browser test requires;
- introduce the regression that motivated the test.

If the test still passes after the behavior is broken, the test is not evidence
of the behavior and must be strengthened. Coverage percentages do not replace
this proof.

## Determinism and isolation

Unit tests reject outbound `fetch` by default. Fake timers are opt-in for tests
that explicitly control time; prefer an injected clock when the behavior is
important enough to test as a contract. The default test timeout is configured
once in Vitest rather than copied into every test. Do not add sleeps, indefinite
retries, or arbitrary timeout increases to hide flakiness.

Playwright tests must wait on observable application state, use stable semantic
selectors, and be safe to run in parallel.

## Mocks, skips, and coverage

Mocks are generally prohibited. Prefer real domain and application code with
real collaborators supplied through explicit dependency injection. A mock, spy,
stub, or fake is permitted only at an
external boundary that cannot safely run in the test process, such as a network
service, clock, random source, filesystem, database, or queue.

Every permitted test double must state the boundary it replaces and why a real
collaborator is unsafe or impractical. Do not mock the function under test, its
immediate domain collaborators, or ordinary application modules. Do not write a
test whose only meaningful assertion is that a mock was called; the observable
result must also be asserted. The active `no-mock-only-tests` rule rejects the
weakest form of this failure, but reviewers must enforce the broader policy.

Focused tests are errors. Skipped tests require a concrete reason and should be
uncommon. Coverage is a guardrail, not the objective; do not add meaningless
assertions to raise a percentage. The repository stores a coverage baseline and
fails when aggregate coverage regresses. Critical domain, authorization, and
security code should additionally use higher local thresholds or mutation
evidence rather than relying on the repository-wide baseline.

The test override intentionally relaxes production size/complexity limits, but
correctness, accessibility, React, React Doctor, and focused-test rules remain
active.
