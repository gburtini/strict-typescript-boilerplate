# Engineering Requirements

This repository is intentionally strict. `pnpm check:all` is the definition of
a valid repository state. `pnpm check` is the fast static/unit subset.

Read the policy document relevant to the change:

- `ARCHITECTURE.md` — workspace boundaries and dependency direction
- `CONVENTIONS.md` — canonical code forms
- `DESIGN.md` — UI composition and styling ownership
- `TESTING.md` — required evidence and test boundaries
- `SECURITY.md` — trust boundaries and security-sensitive behavior
- `COMPATIBILITY.md` — public contracts, migrations, and rollout safety
- `GENERATED.md` — generated-file ownership and freshness
- `DEPENDENCIES.md` — dependency age, lifecycle, and exception policy
- `EXCEPTIONS.md` — the only protocol for justified deviations
- nested `AGENTS.md` files — local subtree exceptions

## Required verification

Before completing any change, run `pnpm check:all`. It must pass with zero
errors and zero lint warnings. Tool-generated informational output is not a
repository warning unless the named check reports it as a failure.

## Never weaken verification

Fix failures at their cause. Do not:

- use `any`, `@ts-ignore`, `@ts-nocheck`, or unexplained type assertions;
- add lint suppressions or weaken a rule to make code pass;
- add files to ignore lists or change check scripts to bypass failures;
- remove behavioral evidence without an explicit replacement or justification;
- modify generated files directly;
- introduce CommonJS, default exports, or deep dependency imports;
- use `React.useState`; import React APIs by their canonical named form;
- use raw colors, arbitrary Tailwind values, inline styles, or restyle UI primitives.

## Code quality

- Keep TypeScript strict and use `unknown` at untrusted boundaries.
- Handle every Promise explicitly: await it, return it, or attach an explicit
  rejection path for intentional detached work, such as
  `void task.catch(reportFailure)`.
- Handle errors intentionally; never silently swallow a caught error.
- Prefer existing components and abstractions over duplicate implementations.
- Keep render functions pure and do not mutate props, state, or module globals.
- Respect dependency-cruiser boundaries and keep imports canonical.
- Use the existing shadcn primitives from `packages/ui/`; do not invent
  one-off controls or bypass their variants.
- React Doctor recommendations are warnings by upstream mode, but
  `pnpm check:all` denies warnings. Fix them rather than suppressing them.

## Tests

Test files have a dedicated lint override. They may exceed production
maintainability limits such as maximum lines, statements, parameters, and
function depth, but correctness, accessibility, React, React Doctor, and
focused-test rules remain enforced.

## Database

- Use Drizzle through the `@template/db` adapter and its repository ports.
- Do not use `sql.raw()`; use the typed query builder or parameterized
  `sql\`...\`` for unsupported SQL.
- Do not issue `UPDATE` or `DELETE` statements without a `WHERE` clause.
- Do not import Drizzle or the raw PostgreSQL client outside the database
  adapter boundary.
- Schema changes require generated and committed migrations.
- Never use `drizzle-kit push` for production schema changes.
- Database-enforceable invariants belong in constraints, not only application
  code.
- Define foreign keys for relational integrity unless an exception is
  documented, and index foreign keys used for joins or lookups.
- Use transactions when multiple writes form one atomic operation.
- Prefer existing query/repository functions over creating another access path.
- Run `pnpm db:check` after schema changes and include migration metadata in
  the same change.

## Workspace boundaries

- `apps/*` contains runnable applications.
- `packages/*` contains reusable libraries and design-system primitives.
- Packages must not import application code.
- Use `workspace:*` for internal package dependencies.

## Agent operating safety

- Inspect and preserve existing uncommitted work before editing.
- Search for the canonical implementation before adding a helper, component,
  dependency, or parallel abstraction.
- Do not broaden the task silently.
- Require explicit approval before destructive actions, production changes,
  credential access, dependency graph changes, or external-service mutations.
  Restoring dependencies from the committed lockfile is routine.
- Never weaken a check, add an ignore, or change enforcement to finish a task.
- Report the exact verification commands run, their results, and anything not
  verified.
- Stop and ask when requirements conflict across a material boundary; do not
  guess by weakening the stricter contract.

## Done

A task is complete only when `pnpm check:all` passes. If the environment prevents a
check, report the exact failing command and do not claim the repository is green.
