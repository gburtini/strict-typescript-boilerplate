# TypeScript Boilerplate

An opinionated pnpm monorepo starter that treats repository consistency and
correctness as enforceable contracts.

## Core stack

Exact dependency versions are pinned in the workspace manifests and lockfile.

| Technology   | Role                                                            |
| ------------ | --------------------------------------------------------------- |
| React        | User interface                                                  |
| oRPC         | Typed API contracts and transport                               |
| Effect       | Application computations, typed failures, and resource handling |
| Tailwind CSS | Utility classes and design tokens                               |

## Repository guarantees

| Engineering value                                             | How the repository supports it                                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Reproducible setup                                            | Node and pnpm versions are pinned through nvm and Corepack.                                                                               |
| Strict types and validated inputs                             | TypeScript, Oxlint, named Zod schemas, and boundary fixtures.                                                                             |
| Clear module boundaries                                       | Packages expose public APIs; checks prevent reverse dependencies and cycles; Effect ports keep application logic independent of adapters. |
| Explicit async and failure handling                           | Oxlint, Effect diagnostics, Semgrep, and failure-path tests.                                                                              |
| Estimated query plans expose performance changes early        | Integration tests capture real queries; CI compares PostgreSQL estimated plans for the base and proposed changes.                         |
| Accessible, responsive interfaces                             | Shared UI primitives, React Compiler checks, and browser evidence.                                                                        |
| Tests prove they catch failures; generated files stay current | New tests demonstrate failure when their protected behavior is deliberately broken; generated-file freshness checks.                      |
| Security checks catch risky APIs and vulnerable packages      | Semgrep checks dangerous APIs; OSV-Scanner and pnpm audit scan dependencies.                                                              |
| Narrow, reviewable exceptions                                 | Structured exception registry with scope, owner, rationale, and evidence.                                                                 |
| Guardrail changes need another reviewer                       | Trusted-base comparison and branch rules require independent review of changes to checks and policies.                                    |
| AI review stays advisory                                      | Versioned rules and labeled fixtures; insufficient evidence is reported separately.                                                       |

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

## Usage

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

`pnpm check:all` runs the complete repository gate:

- Formatting, runtime preflight, and strict type checking.
- Type-aware Oxlint, applicable React Doctor rules, React Compiler, React and
  accessibility rules, and shadcn design-system rules.
- Knip, dependency-cruiser, Sherif, and Vitest.
- Real PostgreSQL integration, migration application, and captured query plans.
- Desktop and narrow browser completion and recovery evidence.

React Doctor keeps its upstream warning severity, while `--deny-warnings` makes
every warning a required fix. Docker is required.

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
