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

## Automated checks and review obligations

The repository combines deterministic checks, advisory semantic review, and
contributor obligations. Passing checks establishes the contracts they exercise;
owners still review product decisions, security design, and changes to enforcement.

| Engineering value                                      | How the repository supports it                                                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reproducible toolchain and dependency installs         | `.nvmrc`, `packageManager`, and `pnpm-lock.yaml` pin Node, pnpm, and package resolution.                                                                                          |
| Strict types and validated inputs                      | TypeScript, Oxlint, named Zod schemas, and boundary fixtures.                                                                                                                     |
| One-way package and module dependencies                | Dependency-cruiser checks configured import boundaries and cycles; `pnpm api:check` checks that declared export targets exist. Effect ports are documented architecture guidance. |
| Explicit async and failure handling                    | Oxlint, Effect diagnostics, Semgrep, and failure-path tests.                                                                                                                      |
| Estimated query plans expose performance changes early | Integration tests capture real queries; CI compares PostgreSQL estimated plans for the base and proposed changes.                                                                 |
| Accessible, responsive interfaces                      | Oxlint checks selected React and accessibility rules; browser tests exercise desktop and narrow layouts.                                                                          |
| Tests detect broken behavior                           | Executable mutation canaries protect three starter contracts; coverage cannot regress. Contributors demonstrate a failure mode for every new test.                                |
| Generated files stay current                           | Declared generated artifacts have ownership and freshness checks.                                                                                                                 |
| Sensitive functions can require authorization evidence | GDP types bind proofs to named values; lint restricts proof construction and rejects exported provers, proof assertions, type assertions, and `any`.                              |
| Semantic design problems are surfaced for review       | JEV provides nine advisory judgments; the required offline check validates its configuration and labeled fixtures.                                                                |
| Security findings are visible in CI                    | Semgrep checks selected code patterns; OSV-Scanner and pnpm audit report known dependency vulnerabilities.                                                                        |
| Strict, reviewable linting                             | One Oxlint config owns rules and necessary scoped overrides; warnings fail lint.                                                                                                  |
| Enforcement changes are surfaced for review            | A trusted-base workflow reports changes to checks and policies; governance policy calls for independent review.                                                                   |

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
depends on them. Checks validate acceptance records and referenced test paths;
owners review whether the behavior and design satisfy the recorded choices.

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

`pnpm check` runs the static and unit gate, including:

- Runtime and toolchain checks, formatting, and strict type checking.
- Type-aware Oxlint, React Doctor, React and accessibility rules, GDP proof
  rules, and shadcn design-system rules, plus suppression metadata checks.
- Semgrep, enforcement fixtures, package exports, migration metadata, and
  generated-file freshness.
- Offline JEV configuration and corpus validation.
- Knip, dependency-cruiser, Sherif, coverage-enabled Vitest, the coverage
  ratchet, and executable regression canaries.

`pnpm check:all` adds the obligations selected by `project-profile.json`. For
this starter's database profile, it runs disposable PostgreSQL integration,
migration application, captured query-plan analysis, the production build,
React Compiler checks, and browser workflows covering completion and recovery
at desktop and narrow layouts.

Oxlint runs with `--deny-warnings`, so React Doctor warnings fail lint. Docker is
required for Semgrep and the PostgreSQL checks.

CI's `Repository acceptance` also requires initialized-project smoke
verification, Actionlint, security scans and dependency audits, and the applicable
base/proposed query-plan comparison. The separate `Trusted enforcement
comparison` reports changes to protected checks and policies for independent
review. Configure the required repository ruleset as described in
[GOVERNANCE](docs/policies/GOVERNANCE.md); these files do not activate server settings.

## Authorization proofs

Use `@gdp-ts/core` when a sensitive function must require evidence that an
authorization check succeeded for the exact values it receives. Parse untrusted
inputs with Zod, bind the validated values with `name()`, and pass the matching
`Named` values and proof to the protected function inside that callback.

Proof checks live under `proofs/`. Each module keeps its `defineProof()` prover
private and exports a proof type and a check returning an Effect `Option`.
Only these modules may define proofs; restrictions on exported provers,
assertions, and `any` still apply there. The check owns the runtime authorization
decision, so its correctness requires review and behavioral evidence.

The [profile-access example](packages/core/src/examples/gdp/profile-access.ts)
returns a private email only when the authenticated user owns the profile.
It demonstrates the pattern; application code must adopt it where required.
See [SECURITY](docs/policies/SECURITY.md#authorization-and-secrets) for the full contract.

## Advisory semantic review with JEV

JEV evaluates nine judgments: duplicate abstractions, bypassed repository
primitives, behavior in the wrong layer, parallel sources of truth, leaked
implementation representations, bypassed validation or authorization, conflicting
failure semantics, and broken atomicity contracts. The versioned rules live in
[`rules.json`](devtools/quality/semantic/rules.json).

| Command                   | Purpose                                                                                                      | External model calls                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `pnpm semantic:check`     | Validate rule configuration, labeled fixtures, and positive/negative policy cases; required by `pnpm check`. | None.                                                            |
| `pnpm lint:semantic`      | Review the branch diff against `origin/main` with bounded repository context.                                | Sends selected source, tests, and policies to Vercel AI Gateway. |
| `pnpm lint:semantic:eval` | Evaluate the synthetic fixture corpus and report metrics.                                                    | Sends synthetic fixtures to Vercel AI Gateway.                   |

Live evaluation uses `typesafe-ai/jev` and Gateway authentication. Source
submission requires explicit authorization. Findings remain advisory and do not
fail the command; unavailable evaluation is not clean semantic evidence. Missing
context produces insufficient evidence rather than a pass.

The separate CI evaluation workflow runs synthetic fixtures after matching
changes reach `main`, or by manual dispatch on `main`. It skips live evaluation
with an explicit notice when the Gateway secret is missing. See
[JEV semantic checks](devtools/quality/semantic/README.md) for authentication,
context collection, thresholds, and evaluation metrics.

## Evidence that tests can fail

`pnpm test:regressions` runs passing tests, mutates an isolated source copy, and
requires the intended assertions to fail. It protects three starter contracts:
retry budgets, SQL normalization, and immutable asset caching.

Every new test also needs a demonstrated failure mode: temporarily break the
behavior it protects and confirm the test fails for the intended reason. Record
that evidence in the pull request or attached artifacts. The automated canaries
cover representative contracts; they do not establish mutation coverage for
every test. See [TESTING](docs/policies/TESTING.md#proof-that-a-test-can-fail).

## Structure

- `apps/web/` is the runnable React/Vite example application.
- `packages/core/` contains domain and application code, API contracts,
  telemetry ports, and the GDP proof example.
- `packages/db/` contains the Drizzle adapter, migrations, and query capture.
- `packages/ui/` contains shared design-system primitives.
- `packages/ui/src/lib/utils.ts` contains the canonical `cn` class-merging helper.
- `devtools/` contains repository checks and database/query-plan tools.
- `docs/` contains contributor policies, architecture decisions, acceptance
  records, and design briefs. Run logs and failure transcripts belong in ignored
  `.artifacts/` or pull-request and CI artifacts.
- `AGENTS.md` contains instructions for contributors and coding agents.
- Oxlint configuration is in `.oxlintrc.jsonc`; package dependency rules
  are in `devtools/dependency-cruiser/`.

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
