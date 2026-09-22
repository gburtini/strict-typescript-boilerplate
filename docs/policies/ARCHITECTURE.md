# Architecture

This is a pnpm monorepo. Architecture is enforced by dependency-cruiser,
package exports, Knip, and Sherif where those tools can express the invariant.
The layer names below are the canonical direction for projects that introduce
those directories; the current starter enforces workspace/package boundaries
and cycles, not an imaginary domain layer that does not yet exist.

## Workspace boundaries

```text
apps/*       runnable applications
packages/*   reusable libraries and design-system primitives
```

Packages must not import application code. Applications may depend on packages
through declared `workspace:*` dependencies and public package exports.

## Conceptual layers

Application code should flow toward stable abstractions:

```text
oRPC transport/public API contract
                 ↓
Effect application + domain computations
                 ↓
adapters: database / HTTP / filesystem / queues / telemetry
```

oRPC owns transport-facing schemas, procedure inputs/outputs, and public API
contracts. It must not contain database or filesystem behavior.

Effect owns application and domain computations, typed failure channels,
cancellation, bounded retries, and spans. It must not know which concrete
adapter implements a boundary.

Adapters own side effects. They receive validated inputs, translate external
failures into typed infrastructure errors while preserving `cause`, and are
provided to application code through explicit dependency injection.

`@template/db` is the database adapter boundary. It owns Drizzle, the
PostgreSQL driver, schema definitions, Drizzle-Zod boundary schemas, and
migrations. Domain and application modules do not import it directly; they
depend on repository ports supplied by a composition root.

### Domain

Domain code contains deterministic business rules, domain types, and pure
transformations. It must not depend on React, HTTP, databases, filesystem APIs,
environment variables, analytics, or framework APIs.

### Application

Application code coordinates use cases and workflows. It may depend on domain
code and should depend on infrastructure through explicit interfaces rather
than concrete adapters where practical.

### Infrastructure

Infrastructure contains external-system integrations: databases, HTTP clients,
filesystem access, queues, email, analytics, and external APIs. External
concepts must not leak into domain APIs.

### UI

UI contains React components, routes, pages, interaction, and presentation
state. Components may invoke application APIs; business rules do not originate
in components.

## Imports and public APIs

- Do not introduce dependency cycles.
- Do not import another feature's internal module.
- Use a package or feature public entrypoint instead of deep internal imports.
- Keep package `exports` intentionally small; `pnpm api:check` verifies that
  declared targets exist.
- Export a symbol because another module currently needs it, not speculatively.

## Side effects and configuration

Side effects belong at boundaries. Keep pure computation separate from network,
filesystem, database, time, randomness, and process state.

Prefer lightweight dependency injection at those boundaries: pass a narrow
interface, function, or immutable context into the code that needs it. Do not
introduce a global container or framework-wide service locator. Dependency
injection should make the dependency visible and replaceable without making the
application architecture indirect.

For example, application code may accept a `Clock` or `UserRepository`
interface while infrastructure provides the concrete implementation at startup.
Domain code should remain usable with ordinary in-memory values and should not
know which adapter supplied them.

Parse and validate environment configuration once near application startup.
Application code must consume typed configuration rather than reading
`process.env` throughout the tree.

Validate untrusted input at HTTP, external API, environment, persistence, and
queue boundaries. TypeScript types are not runtime validation.

Environment variables are validated once with T3 Env and Zod at startup. Raw
`process.env` or `import.meta.env` access is forbidden outside the environment
module. Public request boundaries use oRPC contracts with runtime schemas.

Telemetry is an adapter. Domain code may add semantic spans through the core
Effect helper, but exporters, SDK registration, credentials, and transport
configuration belong in runtime-specific adapter startup code.

Database conventions, migration safety, query constraints, and adapter
lifecycle rules are defined in [`DATABASE.md`](DATABASE.md).

## Architecture changes

Before adding a layer, service abstraction, repository abstraction, event
system, state container, dependency-injection mechanism, or global registry,
show the concrete duplication or boundary failure it solves. Prefer the
smallest architecture that preserves these dependency rules.


## Ports, adapters, and composition

Domain packages own capability-shaped ports. Infrastructure packages own their
concrete adapters. Runnable applications own composition: they validate config,
construct adapters, and pass one cohesive dependency object into the use case or
session. Do not mix validated configuration with injected runtime services in a
single options schema.

A repository is an application-facing persistence capability, not a table
wrapper. Prefer one repository per cohesive aggregate or evidence stream. When
multiple repositories differ only by table and validation schema, share a small
infrastructure helper for the insert/error mechanics while retaining distinct
ports. Do not duplicate the same try/insert/returning/error protocol across
adapters.
