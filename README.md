# TypeScript Boilerplate

An opinionated pnpm monorepo starter that treats repository consistency and
correctness as enforceable contracts.

## Decisions

This inventory distinguishes executable guarantees from written requirements.
Dependency versions are pinned in the workspace manifests and lockfile. Changes
to enforcement or exceptions require independent owner review.

| Dependency                                | Selection                                                 | Purpose and ownership                                                                                     |
| ----------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `@axe-core/playwright`                    | `4.13.0`                                                  | Browser accessibility evidence; apps/web                                                                  |
| `@babel/core`                             | `7.29.7`                                                  | React Compiler's Babel 7 AST integration; apps/web                                                        |
| `@rolldown/plugin-babel`                  | `0.2.4`                                                   | Required compiler integration with Vite 8; apps/web                                                       |
| `@types/babel__core`                      | `7.20.5`                                                  | Compiler integration types; apps/web                                                                      |
| `babel-plugin-react-compiler`             | `1.0.0`                                                   | Required automatic memoization; apps/web                                                                  |
| `@template/core`                          | `workspace:*`                                             | Domain schemas, application ports and telemetry; apps/web, packages/db                                    |
| `@effect/opentelemetry`                   | `0.64.1`                                                  | Effect trace-context propagation; packages/core                                                           |
| `@effect/tsgo`                            | `0.45.0`                                                  | Effect diagnostics integrated into the pinned TypeScript and lint toolchain; .                            |
| `@opentelemetry/api`                      | `1.9.1`                                                   | Instrumentation interfaces; packages/core                                                                 |
| `@opentelemetry/exporter-trace-otlp-http` | `0.222.0`                                                 | OTLP trace transport behind redaction; packages/core                                                      |
| `@opentelemetry/resources`                | `2.11.0`                                                  | Service metadata; packages/core                                                                           |
| `@opentelemetry/sdk-trace-base`           | `2.11.0`                                                  | Span processing; packages/core                                                                            |
| `@opentelemetry/sdk-trace-node`           | `2.11.0`                                                  | Node telemetry runtime; packages/core                                                                     |
| `@orpc/contract`                          | `1.14.15`                                                 | Runtime public API schemas; packages/core                                                                 |
| `@orpc/server`                            | `1.14.15`                                                 | Typed transport implementation; packages/core, apps/web                                                   |
| `@playwright/test`                        | `1.63.0`                                                  | Observable workflow, recovery, and screenshot evidence; apps/web                                          |
| `@radix-ui/react-slot`                    | `1.3.3`                                                   | Workspace contract dependency; packages/ui                                                                |
| `@rikalabs/oxlint-standards`              | `0.8.1`                                                   | Repository anti-shortcut, boundary, security, and Effect rules; .                                         |
| `@shadcn/lint`                            | `0.1.1`                                                   | Semantic styling vocabulary and primitive ownership; .                                                    |
| `@t3-oss/env-core`                        | `0.13.11`                                                 | Central validated runtime configuration; apps/web, packages/db                                            |
| `@tailwindcss/vite`                       | `4.3.3`                                                   | Semantic Tailwind compilation; apps/web                                                                   |
| `@template/db`                            | `workspace:*`                                             | Workspace-owned PostgreSQL adapter and planner tools; repository tooling, apps/web server                 |
| `@template/ui`                            | `workspace:*`                                             | Shared accessible control contracts; apps/web                                                             |
| `@testing-library/dom`                    | `10.4.1`                                                  | Accessible DOM queries; apps/web                                                                          |
| `@testing-library/react`                  | `16.3.3`                                                  | Component behavior evidence; apps/web                                                                     |
| `@types/node`                             | `24.13.4`                                                 | Node runtime types; .                                                                                     |
| `@types/react`                            | `19.2.7`                                                  | React public types; apps/web, packages/ui                                                                 |
| `@types/react-dom`                        | `19.2.3`                                                  | DOM renderer types; apps/web                                                                              |
| `@typescript-eslint/utils`                | `8.70.0`                                                  | Typed lint-rule support; .                                                                                |
| `@typescript/native`                      | `npm:typescript@7.0.2`                                    | Native TypeScript compiler integration; .                                                                 |
| `@vitejs/plugin-react`                    | `6.0.3`                                                   | React compilation; apps/web                                                                               |
| `@vitest/coverage-v8`                     | `4.1.11`                                                  | Coverage evidence and thresholds; apps/web                                                                |
| `ai`                                      | `7.0.105`                                                 | Advisory Jev evaluation through AI Gateway; .                                                             |
| `class-variance-authority`                | `0.7.1`                                                   | Workspace contract dependency; packages/ui                                                                |
| `clsx`                                    | `2.1.1`                                                   | Workspace contract dependency; packages/ui                                                                |
| `dependency-cruiser`                      | `18.3.0`                                                  | Dependency direction and cycle enforcement; devtools/dependency-cruiser                                   |
| `drizzle-kit`                             | `0.31.10`                                                 | Generated migration ownership and metadata checks; .                                                      |
| `drizzle-orm`                             | `0.45.2`                                                  | Typed PostgreSQL queries and schema definitions; packages/db                                              |
| `drizzle-zod`                             | `0.8.3`                                                   | Persistence boundary schemas; packages/db                                                                 |
| `effect`                                  | `3.22.2`                                                  | Typed failures, cancellation, retries, and application computations; apps/web, packages/core, packages/db |
| `eslint`                                  | `10.10.0`                                                 | Plugin interoperability; .                                                                                |
| `eslint-plugin-drizzle`                   | `0.2.3`                                                   | Reject unscoped update/delete operations; .                                                               |
| `jsdom`                                   | `26.1.0`                                                  | Component test DOM; apps/web                                                                              |
| `knip`                                    | `6.35.0`                                                  | Unused code and dependency checks; .                                                                      |
| `oxfmt`                                   | `0.66.0`                                                  | Canonical formatting; .                                                                                   |
| `oxlint`                                  | `1.81.0`                                                  | Type-aware linting; zero warnings; .                                                                      |
| `oxlint-plugin-react-doctor`              | `0.9.12`                                                  | React correctness, accessibility, and performance checks; .                                               |
| `oxlint-tsgolint`                         | `7.0.2001`                                                | Type-aware lint implementation; .                                                                         |
| `postgres`                                | `3.4.9`                                                   | PostgreSQL driver inside the adapter/tooling boundary; ., packages/db                                     |
| `react`                                   | `19.3.0`                                                  | UI runtime; apps/web, packages/ui                                                                         |
| `react-dom`                               | `19.3.0`                                                  | Browser rendering; apps/web                                                                               |
| `sherif`                                  | `1.13.0`                                                  | Workspace manifest consistency; .                                                                         |
| `tailwind-merge`                          | `3.6.0`                                                   | Workspace contract dependency; packages/ui                                                                |
| `tailwindcss`                             | `4.3.3`                                                   | Static semantic layout and styling vocabulary; apps/web                                                   |
| `tw-animate-css`                          | `1.4.0`                                                   | Shared animation vocabulary; apps/web                                                                     |
| `typescript`                              | `npm:@typescript/typescript6@6.0.2, npm:typescript@7.0.2` | Strict compiler authority; ., devtools/dependency-cruiser                                                 |
| `vite`                                    | `8.2.2`                                                   | Browser development and production builds; apps/web                                                       |
| `vitest`                                  | `4.1.11`                                                  | Unit, contract, and integration runner; apps/web, packages/core, packages/db                              |
| `yaml`                                    | `2.9.1`                                                   | Validated workflow configuration parsing; .                                                               |
| `zod`                                     | `4.1.13`                                                  | Zod 4 runtime decoding; ., apps/web, packages/core, packages/db                                           |

| Requirement or decision                                                         | Enforcement / source of truth                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Node 24.13.1 through nvm; pnpm 10.30.3 through Corepack; ESM                    | `.nvmrc`, runtime check, `packageManager`, import rules                                                |
| Strict types; no unsafe escape hatches; explicit boundary types                 | TypeScript, type-aware Oxlint, negative enforcement fixtures                                           |
| Parse untrusted data once with named Zod 4 schemas                              | Boundary rules plus contract tests; semantic validation needs review                                   |
| Explicit Promise handling and intentional failures                              | Oxlint, Effect diagnostics, Semgrep, failure-path tests                                                |
| Canonical named imports/exports and formatting                                  | Oxlint and Oxfmt; framework configuration exceptions are scoped                                        |
| Application/domain computations use Effect; I/O uses injected ports             | Architecture policy, Effect lint, dependency rules, integration tests                                  |
| Packages cannot import applications; no cycles or private cross-package imports | Dependency-cruiser, public exports, Knip, fixtures                                                     |
| Database queries are typed, bounded, authorized, and atomic where required      | Drizzle lint plus DATABASE policy and real adapter evidence                                            |
| Migrations are generated and compatible with deployed consumers                 | Migration freshness, real PostgreSQL tests, COMPATIBILITY review                                       |
| Queries and indexes need representative planner evidence                        | Captured test corpus, pinned PostgreSQL fixture, base/proposed comparison                              |
| Controls own appearance; callers own layout                                     | shadcn lint, semantic theme, shared UI variants                                                        |
| React Compiler is required for React products; compiler failures block builds   | Vite compiler preset, all-errors diagnostics, `pnpm compiler:check` actual transformation evidence     |
| Framework rules follow selected frameworks and declared compiler applicability  | `project-profile.json`, upstream rule metadata, governance fixtures; applicable warnings remain denied |
| UX states, recovery, keyboard use, responsiveness, and aesthetics               | PRODUCT acceptance records, design brief, browser evidence, owner review                               |
| Every test file has failure evidence with explicit provenance                   | Evidence checker distinguishes execution artifacts from attestations                                   |
| Tests are deterministic and behavior focused                                    | Vitest/Playwright policy and lint; browser and real database suites                                    |
| Generated output has an authoritative source and freshness command              | `generated-files.json`, generators, freshness checks                                                   |
| Exceptions have exact scope, value, owner, rationale, tracking, and evidence    | Structured exception registry and effective-config comparison                                          |
| Dependency age, lifecycle, and vulnerability management                         | pnpm release age, lockfile review, OSV/audit, DEPENDENCIES policy                                      |
| Security boundaries, secrets, uploads, outbound HTTP, and tenant scope          | SECURITY policy; lint/scanners and application-specific negative tests                                 |
| Stable telemetry scope; runtime service identity; no query parameters exported  | TELEMETRY policy and exporter tests                                                                    |
| Enforcement changes need independent approval                                   | Independent review, trusted base comparison, administrator-configured ruleset                          |
| `pnpm check:all` is the local profile gate; CI adds security comparisons        | Project profile and required `Repository acceptance` result                                            |
| Semantic model review is advisory, with insufficiency reported separately       | Versioned rules, labeled fixtures; synthetic evaluation on reviewed main                               |

| Written policy                                  | Decisions it governs                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| [ARCHITECTURE](docs/policies/ARCHITECTURE.md)   | Ownership, dependency direction, ports, adapters, and composition               |
| [CONVENTIONS](docs/policies/CONVENTIONS.md)     | Canonical TypeScript, modules, React, failures, and control flow                |
| [DESIGN](docs/policies/DESIGN.md)               | Visual vocabulary, tokens, primitives, and styling ownership                    |
| [PRODUCT](docs/policies/PRODUCT.md)             | User outcomes, state applicability, interaction acceptance, and design evidence |
| [TESTING](docs/policies/TESTING.md)             | Test levels, determinism, boundary doubles, red-state evidence, and coverage    |
| [SECURITY](docs/policies/SECURITY.md)           | Trust, authorization, secrets, dangerous sinks, privacy, and incidents          |
| [DATABASE](docs/policies/DATABASE.md)           | Data contracts, queries, tenancy, transactions, migrations, and operations      |
| [QUERY-PLANS](docs/policies/QUERY-PLANS.md)     | Query capture, representative fixtures, plan risk, and baseline ownership       |
| [TELEMETRY](docs/policies/TELEMETRY.md)         | Trace context, runtime identity, redaction, and failure reporting               |
| [EFFECT](docs/policies/EFFECT.md)               | Typed runtime computation and terminal-runner ownership                         |
| [COMPATIBILITY](docs/policies/COMPATIBILITY.md) | Public contracts, mixed-version rollout, migration, and recovery                |
| [GENERATED](docs/policies/GENERATED.md)         | Generators, ownership, regeneration, and freshness                              |
| [DEPENDENCIES](docs/policies/DEPENDENCIES.md)   | Release age, lifecycle execution, provenance, and vulnerability review          |
| [EXCEPTIONS](docs/policies/EXCEPTIONS.md)       | Justified deviations and exact scope with independent approval                  |
| [GOVERNANCE](docs/policies/GOVERNANCE.md)       | Trusted enforcement comparisons and required repository settings                |

### Per-product human decisions

Agents can draft these documents and make decisions concrete. Product owners and
responsible engineers must supply and review the inputs below before the
corresponding implementation. A passing check cannot decide product intent.

| Document                                                                           | Human input required                                                                                                           | What the agent can do                                                                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [PRODUCT](docs/policies/PRODUCT.md) and feature acceptance records                 | **High:** intended users, problems worth solving, desired outcomes, scope, priorities, domain rules, and acceptable recovery   | Interview the owner, draft criteria, identify missing states, implement and demonstrate agreed behavior   |
| [DESIGN](docs/policies/DESIGN.md) and [product design brief](docs/design/BRIEF.md) | **High:** brand, tone, references, distinctiveness, density, hierarchy, device context, and approval of representative screens | Offer concrete alternatives, map the chosen direction into tokens and primitives, capture review evidence |
| SECURITY and DATABASE                                                              | Data classification, tenant/permission model, retention, compliance needs, recovery objectives, and risk acceptance            | Propose capability boundaries, constraints, threat cases, tests, and operational checks                   |
| ARCHITECTURE and COMPATIBILITY                                                     | Deployment topology, consumers, scale, operational constraints, rollout authority, and acceptable downtime                     | Compare options, document contracts and tradeoffs, implement boundaries and recovery evidence             |
| GOVERNANCE and EXCEPTIONS                                                          | Accountable owners, independent reviewers, administrator-controlled rules, and approval of deviations                          | Produce reviewable diffs, check exact scopes, and explain replacement evidence                            |
| CONVENTIONS, TESTING, GENERATED, EFFECT, QUERY-PLANS, TELEMETRY, DEPENDENCIES      | Usually limited customization; review deliberate changes and project-specific constraints                                      | Apply the baseline, automate checks, and report evidence and blockers                                     |

Do not invent user needs, success metrics, compliance requirements, or brand
preferences to fill a document. Mark unresolved decisions and obtain the
responsible human input before implementing behavior that depends on them.

## The contract

```sh
# Run these from the repository root in a shell where nvm is initialized.
nvm install
nvm use
node --version
corepack enable
corepack install
pnpm install
pnpm check:all
```

`.nvmrc` is the source of truth for Node.js. Always use nvm to select that
version before running Node.js or pnpm commands; if `nvm` is not available,
initialize/install it in your shell first. The `node --version` output should
match `.nvmrc` (`v24.13.1`).

`pnpm check:all` runs the complete repository gate: formatting, runtime preflight,
strict type checking, Oxlint with type-aware
rules, applicable React Doctor rules, React Compiler, React and
accessibility rules, shadcn design-system rules, Knip, dependency-cruiser,
Sherif, and Vitest. React Doctor keeps its upstream warning severity, while
`--deny-warnings` makes every warning a required fix. The profile also requires
real PostgreSQL integration, migration application, captured query plans, and
desktop/narrow browser completion and recovery evidence. Docker is required.

The repository intentionally has no warning state: checks are either passing or
the implementation needs to change.

## Structure

- `apps/web/` is the runnable React/Vite example application.
- `packages/ui/` contains shared design-system primitives.
- `packages/ui/src/lib/utils.ts` contains the canonical `cn` class-merging helper.
- `devtools/` contains repository checks, semantic quality policy,
  dependency-boundary tooling, database operations, planner fixtures, and
  schemas for tooling metadata.
- `docs/` contains contributor policies, architecture decisions, and check
  evidence.
- `AGENTS.md` is the short policy for human and coding-agent contributors.
- `oxlint.config.ts` and `oxlint.base.json` are repository law; the
  dependency-cruiser rules live in `devtools/dependency-cruiser/`.

The starter is deliberately small. Add new applications under `apps/` and
shared libraries under `packages/`; encode every repeated architectural
decision in a check when it can be made mechanical.

## Customize for a project

Keep the generic `@template/*` package names and starter identity while this
repository is used as a boilerplate. When creating a project from it, rename
the package scopes and project-specific defaults together. Search the entire
repository for these values before the first project commit:

- `@template/`
- `typescript-boilerplate`
- `TypeScript Boilerplate`
- starter/example screen names and copy

Do not begin feature work until the template identity is removed. The first
project commit must replace the package scope, root package name, database name,
telemetry scope, UI copy, and generated metadata as one atomic initialization
change. Package manifests and imports must use the project scope; carrying
`@template/*` into product code is a failed initialization, not harmless
boilerplate.

Also review environment defaults, package exports, test evidence, migration
metadata, and deployment workflows. Run the full contract from the renamed repository root:

```sh
nvm install
nvm use
corepack enable
corepack install
pnpm install
pnpm check:all
```

## UI primitives

The shared UI package includes Button, Card, Input, and Label primitives with Tailwind
tokens. `@shadcn/lint` rejects raw colors, arbitrary values, inline styles,
unknown classes, dynamic class construction, and restyling primitives at call
sites. Primitive implementation files are exempt only from `no-restyle` so the
components can define their own contract.
