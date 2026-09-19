# Testing

Tests are evidence of observable behavior, in addition to static verification.

## Required commands

```text
pnpm check
pnpm build
pnpm test:e2e
```

The first command runs formatting, package API checks, type checking, linting,
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

## Test behavior, not implementation

Use given/when/then behavior and externally observable results. Prefer accessible
roles, labels, and visible content in React tests. Avoid assertions on class
names, incidental DOM structure, private state, or mock call choreography.

Bug fixes should normally include a regression test that exercises the failure
mechanism.

## Determinism and isolation

Unit tests use fake timers and reject outbound `fetch` by default. Mock or inject
external boundaries explicitly. Do not add sleeps, indefinite retries, or
arbitrary timeout increases to hide flakiness.

Playwright tests must wait on observable application state, use stable semantic
selectors, and be safe to run in parallel.

## Mocks, skips, and coverage

Mock boundaries, not the function under test. Focused tests are errors. Skipped
tests require a concrete reason and should be uncommon. Coverage is a guardrail,
not the objective; do not add meaningless assertions to raise a percentage.

The test override intentionally relaxes production size/complexity limits, but
correctness, accessibility, React, React Doctor, and focused-test rules remain
active.
