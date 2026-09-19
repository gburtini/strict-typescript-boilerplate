# TypeScript Boilerplate

An opinionated pnpm monorepo starter that treats repository consistency and
correctness as enforceable contracts.

## Runtime

- ESM only
- Node 24+
- pnpm 10.30.3
- React 19

## The contract

```sh
pnpm install
pnpm check
```

`pnpm check` runs formatting, strict type checking, Oxlint with type-aware
rules, all 842 rules in the installed React Doctor registry, React and
accessibility rules, shadcn design-system rules, Knip, dependency-cruiser,
Sherif, and Vitest. React Doctor keeps its upstream warning severity, while
`--deny-warnings` makes every warning a required fix.

The repository intentionally has no warning state: checks are either passing or
the implementation needs to change.

## Structure

- `apps/web/` is the runnable React/Vite example application.
- `packages/ui/` contains shared design-system primitives.
- `packages/ui/src/lib/utils.ts` contains the canonical `cn` class-merging helper.
- `AGENTS.md` is the short policy for human and coding-agent contributors.
- `.oxlintrc.json` and `.dependency-cruiser.cjs` are repository law.

The starter is deliberately small. Add new applications under `apps/` and
shared libraries under `packages/`; encode every repeated architectural
decision in a check when it can be made mechanical.

## UI primitives

The shared UI package includes Button, Card, Input, and Label primitives with Tailwind
tokens. `@shadcn/lint` rejects raw colors, arbitrary values, inline styles,
unknown classes, dynamic class construction, and restyling primitives at call
sites. Primitive implementation files are exempt only from `no-restyle` so the
components can define their own contract.
