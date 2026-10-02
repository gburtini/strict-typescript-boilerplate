# TypeScript Boilerplate

A pnpm monorepo starter with strict TypeScript and automated checks for package
boundaries, database changes, and UI behavior.

## Core stack

Exact dependency versions are pinned in the workspace manifests and lockfile.

| Technology   | Role                                                            |
| ------------ | --------------------------------------------------------------- |
| React        | User interface                                                  |
| oRPC         | Typed API contracts and transport                               |
| Effect       | Application computations, typed failures, and resource handling |
| Tailwind CSS | Utility classes and design tokens                               |

## Repository guarantees

| Engineering value                                                            | How the repository supports it                                                                                                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reproducible toolchain and dependency installs                               | `.nvmrc`, `packageManager`, and `pnpm-lock.yaml` pin Node, pnpm, and package resolution.                                                                                          |
| Strict types and validated inputs                                            | TypeScript, Oxlint, named Zod schemas, and boundary fixtures.                                                                                                                     |
| One-way package and module dependencies                                      | Dependency-cruiser checks configured import boundaries and cycles; `pnpm api:check` checks that declared export targets exist. Effect ports are documented architecture guidance. |
| Explicit async and failure handling                                          | Oxlint, Effect diagnostics, Semgrep, and failure-path tests.                                                                                                                      |
| Estimated query plans expose performance changes early                       | Integration tests capture real queries; CI compares PostgreSQL estimated plans for the base and proposed changes.                                                                 |
| Accessible, responsive interfaces                                            | Oxlint checks selected React and accessibility rules; browser tests exercise desktop and narrow layouts.                                                                          |
| Tests must fail when protected behavior breaks; generated files stay current | New tests include a demonstrated failure case; generated-file freshness checks.                                                                                                   |
| Security findings are visible in CI                                          | Semgrep checks selected code patterns; OSV-Scanner and pnpm audit report known dependency vulnerabilities.                                                                        |
| Narrow, reviewable exceptions                                                | Structured exception registry with scope, owner, rationale, and evidence.                                                                                                         |
| Enforcement changes are surfaced for review                                  | A trusted-base workflow reports changes to checks and policies; governance policy calls for independent review.                                                                   |

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

### Decisions for a new product

Record product-specific choices in these docs before implementing work that
depends on them. Checks enforce the recorded choices.

| Document                                                                                          | Decisions to make                                                               |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [PRODUCT](docs/policies/PRODUCT.md) and feature acceptance records                                | Users, problem, outcomes, scope, domain rules, and recovery.                    |
| [DESIGN](docs/policies/DESIGN.md) and [product design brief](docs/design/BRIEF.md)                | Brand, tone, references, hierarchy, devices, and representative screens.        |
| [SECURITY](docs/policies/SECURITY.md) and [DATABASE](docs/policies/DATABASE.md)                   | Data classification, tenancy, permissions, retention, compliance, and recovery. |
| [ARCHITECTURE](docs/policies/ARCHITECTURE.md) and [COMPATIBILITY](docs/policies/COMPATIBILITY.md) | Deployment, consumers, scale, rollout, and downtime.                            |
| [GOVERNANCE](docs/policies/GOVERNANCE.md) and [EXCEPTIONS](docs/policies/EXCEPTIONS.md)           | Accountable owners, independent reviewers, and justified deviations.            |
| Other policies                                                                                    | Keep the defaults unless the project has a concrete reason to change them.      |

Record unresolved choices and ask the responsible owner before implementing
behavior that depends on them.

## Usage

```sh
# Run these from the repository root in a shell where nvm is initialized.
nvm install
nvm use
node --version
corepack enable
corepack install
pnpm install
pnpm browser:install
pnpm check:all
```

`.nvmrc` is the source of truth for Node.js. Always use nvm to select that
version before running Node.js or pnpm commands; if `nvm` is not available,
initialize/install it in your shell first. The `node --version` output should
match `.nvmrc` (`v24.13.1`).

`pnpm check:all` runs the complete repository gate:

- Formatting, runtime preflight, and strict type checking.
- Type-aware Oxlint, applicable React Doctor rules, React Compiler, React and
  accessibility rules, and shadcn design-system rules.
- Knip, dependency-cruiser, Sherif, and Vitest.
- Real PostgreSQL integration, migration application, and captured query plans.
- Browser tests for desktop and narrow layouts, including completion and recovery.

Oxlint runs with `--deny-warnings`, so React Doctor warnings fail lint. Docker is
required for the PostgreSQL checks.

## Structure

- `apps/web/` is the runnable React/Vite example application.
- `packages/ui/` contains shared design-system primitives.
- `packages/ui/src/lib/utils.ts` contains the canonical `cn` class-merging helper.
- `devtools/` contains repository checks and database/query-plan tools.
- `docs/` contains contributor policies, architecture decisions, and check
  evidence.
- `AGENTS.md` contains instructions for contributors and coding agents.
- Oxlint configuration is in `oxlint.config.ts` and `oxlint.base.json`;
  package dependency rules are in `devtools/dependency-cruiser/`.

Add applications under `apps/` and reusable libraries under `packages/`. If a
project rule can be checked automatically, add that check to `devtools/`.

## Customize for a project

Keep the template generic until you create a product checkout. Use the validated
`pnpm init:project` command to initialize identities together, then follow
[Start a project](docs/STARTING-A-PROJECT.md) for development, portable Node
execution and repository governance setup.

`pnpm dev` starts a disposable local database, applies migrations and wires the
reference API to its assigned port. `pnpm build` and `pnpm start` run the built
Node server; browser tests exercise that server.

## UI primitives

The shared UI package provides Button, Card, Input, and Label primitives that
use Tailwind tokens. `@shadcn/lint` rejects raw colors, arbitrary values, inline
styles, unknown classes, dynamic class construction, and call-site restyling.
Only primitive implementation files are exempt from `no-restyle`.
