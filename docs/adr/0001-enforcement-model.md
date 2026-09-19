# ADR 0001: Layered enforcement for agent-authored code

- Status: accepted
- Date: 2026-09-19

## Decision

The repository uses separate enforcement layers with one required command:
`pnpm check`.

- Oxfmt owns formatting.
- TypeScript owns type soundness.
- Oxlint owns language, import, async, React, accessibility, and test rules.
- React Doctor supplies broad React performance and correctness diagnostics.
- Rika Labs supplies custom anti-slop and security rules where built-ins do not
  express the desired invariant.
- shadcn lint owns design-system usage and component styling contracts.
- Knip, dependency-cruiser, and Sherif own graph and package invariants.

All warnings are fatal. Rules may be relaxed only in explicit file overrides,
and every suppression must explain the reason.

## Consequences

The baseline is intentionally strict and may require project-specific overrides
for framework-specific code. Those overrides remain visible in configuration and
must not be hidden in ignore patterns or weakened scripts.
