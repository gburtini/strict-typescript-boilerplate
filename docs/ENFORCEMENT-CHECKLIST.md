# Enforcement checklist

This repository is intentionally hostile to ambiguous code and agent shortcuts.
The enforcement stack is delivered in incremental commits; this file records the
remaining work instead of hiding it in prose.

## Completed

- [x] pnpm workspace with `apps/*` and `packages/*` boundaries.
- [x] Node 24+, ESM, pinned pnpm, strict TypeScript, and explicit return types.
- [x] Runtime preflight rejects unsupported Node versions before other checks.
- [x] Oxfmt formatting with a zero-diff check.
- [x] Oxlint correctness, suspicious, pedantic, performance, style, restriction,
      and nursery categories as errors.
- [x] Oxlint type-aware checks and compiler diagnostics.
- [x] All registered React Doctor rules loaded; warnings fail CI.
- [x] Official shadcn lint rules for raw colors, arbitrary values, inline styles,
      unknown classes, static classes, and component restyling.
- [x] Semantic OKLCH palette with Tailwind/shadcn tokens and primitive contracts.
- [x] Rika Labs custom anti-slop rules for unsafe fallbacks, AI debt comments,
      assertions, secrets, SQL concatenation, duplicate branches, and helper indirection.
- [x] Knip strict dead-code/dependency analysis, Sherif package hygiene, and
      dependency-cruiser boundaries.
- [x] Typed repository-governance scripts validate package manifests at runtime.
- [x] Exception protocol requires rationale-bearing suppressions and documents
      ownership, scope, tracking, and expiry requirements.
- [x] Disabled rules and ignored paths require entries in the exception registry.
- [x] Architecture negative fixtures prove forbidden layer imports fail.
- [x] Generated-file manifests and freshness checks are executable.
- [x] Test red-state evidence is recorded and validated by CI.
- [x] Coverage has a committed non-regression baseline.
- [x] Enforcement documentation is generated from the active lint rules.
- [x] Compatibility, generated-file ownership, dependency, and security
      lifecycle contracts are documented.
- [x] CI actions are pinned to commit SHAs and workflow syntax is actionlinted.
- [x] Test overrides for intentionally softer size/complexity limits.

## Remaining implementation increments

- [x] Add stronger test rules for placeholder tests, mock-only tests, and
      conditional tests; use one repository timeout instead of copied timeouts.
- [x] Add coverage thresholds.
- [x] Add unit-test network isolation.
- [x] Make fake timers opt-in and provide deterministic network isolation for
      unit tests.
- [x] Make `pnpm check:all` the singular green-repository command.
- [x] Add dependency review, OSV vulnerability scanning, CodeQL, and custom
      hardcoded-secret/SQL rules.
- [x] Add repository-owned Semgrep security patterns.
- [x] Add package public-API export checks and cross-package dependency boundaries.
- [x] Add Playwright/axe accessibility smoke coverage for the web workspace.
- [x] Add negative fixtures proving key design-system rules fail for the intended
      reason.
- [x] Add negative fixtures for unsafe sinks, secrets, explicit `any`, floating
      promises, focused tests, default exports, and anonymous suppressions.
- [x] Validate CI action pinning and least-privilege workflow permissions.
- [x] Keep framework-specific Next, Vite, Node, and library templates as opt-in
      extensions rather than weakening this shared baseline.
- [ ] Enable GitHub-native secret scanning when the consuming repository has
      Advanced Security; this starter cannot enable an account-level feature.

Every unchecked item must either be implemented or explicitly documented as a
project-level opt-out before this starter is considered complete.
