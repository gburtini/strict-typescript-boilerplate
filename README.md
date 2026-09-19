# TypeScript Boilerplate

An opinionated React + TypeScript starter that treats repository consistency
and correctness as enforceable contracts.

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
rules, React and accessibility rules, shadcn design-system rules, Knip,
dependency-cruiser, Sherif, and Vitest.

The repository intentionally has no warning state: checks are either passing or
the implementation needs to change.

## Structure

- `src/components/ui/` contains design-system primitives.
- `src/` contains application code.
- `AGENTS.md` is the short policy for human and coding-agent contributors.
- `.oxlintrc.json` and `.dependency-cruiser.cjs` are repository law.

The starter is deliberately small. Add domain boundaries before adding
features, and encode every repeated architectural decision in a check when it
can be made mechanical.
