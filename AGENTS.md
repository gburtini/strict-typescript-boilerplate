# Engineering Requirements

This repository is intentionally strict. `pnpm check` is the definition of a
valid repository state.

## Required verification

Before completing any change, run `pnpm check`. It must pass with zero errors
and zero warnings.

## Never weaken verification

Fix failures at their cause. Do not:

- use `any`, `@ts-ignore`, `@ts-nocheck`, or unexplained type assertions;
- add lint suppressions or weaken a rule to make code pass;
- add files to ignore lists or change check scripts to bypass failures;
- remove or reduce tests;
- modify generated files directly;
- introduce CommonJS, default exports, or deep dependency imports;
- use `React.useState`; import React APIs by their canonical named form;
- use raw colors, arbitrary Tailwind values, inline styles, or restyle UI primitives.

## Code quality

- Keep TypeScript strict and use `unknown` at untrusted boundaries.
- Handle every Promise explicitly: await it, return it, or use `void` for an
  intentional detached operation.
- Handle errors intentionally; never silently swallow a caught error.
- Prefer existing components and abstractions over duplicate implementations.
- Keep render functions pure and do not mutate props, state, or module globals.
- Respect dependency-cruiser boundaries and keep imports canonical.

## Done

A task is complete only when `pnpm check` passes. If the environment prevents a
check, report the exact failing command and do not claim the repository is green.
