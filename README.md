# TypeScript Boilerplate

An opinionated pnpm monorepo starter that treats repository consistency and
correctness as enforceable contracts.

## Runtime

- ESM only
- Node >=24.13.1 <25
- pnpm 10.30.3
- React 19

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
rules, the installed React Doctor registry, React and
accessibility rules, shadcn design-system rules, Knip, dependency-cruiser,
Sherif, and Vitest. React Doctor keeps its upstream warning severity, while
`--deny-warnings` makes every warning a required fix.

The repository intentionally has no warning state: checks are either passing or
the implementation needs to change.

## Structure

- `apps/web/` is the runnable React/Vite example application.
- `packages/ui/` contains shared design-system primitives.
- `packages/ui/src/lib/utils.ts` contains the canonical `cn` class-merging helper.
- `devtools/` contains repository checks, database operations, planner fixtures,
  and schemas for tooling metadata.
- `docs/` contains contributor policies, architecture decisions, and check
  evidence.
- `AGENTS.md` is the short policy for human and coding-agent contributors.
- `oxlint.config.ts`, `oxlint.base.json`, and `.dependency-cruiser.cjs` are
  repository law.

The starter is deliberately small. Add new applications under `apps/` and
shared libraries under `packages/`; encode every repeated architectural
decision in a check when it can be made mechanical.

## UI primitives

The shared UI package includes Button, Card, Input, and Label primitives with Tailwind
tokens. `@shadcn/lint` rejects raw colors, arbitrary values, inline styles,
unknown classes, dynamic class construction, and restyling primitives at call
sites. Primitive implementation files are exempt only from `no-restyle` so the
components can define their own contract.
