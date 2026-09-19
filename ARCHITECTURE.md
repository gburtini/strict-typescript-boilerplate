# Architecture

This is a pnpm monorepo. Architecture is enforced by TypeScript project
references, dependency-cruiser, package exports, Knip, and Sherif where those
tools can express the invariant.

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
UI -> application -> domain
                         ^
                         |
                  infrastructure adapters
```

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

Parse and validate environment configuration once near application startup.
Application code must consume typed configuration rather than reading
`process.env` throughout the tree.

Validate untrusted input at HTTP, external API, environment, persistence, and
queue boundaries. TypeScript types are not runtime validation.

## Architecture changes

Before adding a layer, service abstraction, repository abstraction, event
system, state container, dependency-injection mechanism, or global registry,
show the concrete duplication or boundary failure it solves. Prefer the
smallest architecture that preserves these dependency rules.
