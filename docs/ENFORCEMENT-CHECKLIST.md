# Enforcement checklist

This repository is intentionally hostile to ambiguous code and agent shortcuts.
The enforcement stack is delivered in incremental commits; this file records the
remaining work instead of hiding it in prose.

## Completed

- [x] pnpm workspace with `apps/*` and `packages/*` boundaries.
- [x] Node 24+, ESM, pinned pnpm, strict TypeScript, and explicit return types.
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
- [x] Test overrides for intentionally softer size/complexity limits.

## Remaining implementation increments

- [x] Add stronger test rules for placeholder tests, mock-only tests, conditional
      tests, and explicit test timeouts.
- [x] Add coverage thresholds.
- [x] Add unit-test network isolation.
- [x] Add deterministic fake-timer controls for unit tests.
- [x] Make CI run format, typecheck, lint, dead-code, architecture, package,
      tests, and production build as separate required checks.
- [x] Add dependency review, OSV vulnerability scanning, CodeQL, and custom
      hardcoded-secret/SQL rules.
- [x] Add repository-owned Semgrep security patterns.
- [ ] Enable GitHub-native secret scanning for repositories where Advanced
      Security is available.
- [x] Add package public-API export checks and cross-package dependency boundaries.
- [x] Add Playwright/axe accessibility smoke coverage for the web workspace.
- [x] Add negative fixtures proving key design-system rules fail for the intended
      reason.
- [x] Keep framework-specific Next, Vite, Node, and library templates as opt-in
      extensions rather than weakening this shared baseline.

Every unchecked item must either be implemented or explicitly documented as a
project-level opt-out before this starter is considered complete.
