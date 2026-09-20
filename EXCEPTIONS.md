# Exceptions

The executable checks are the repository contract. Exceptions are rare,
temporary, and reviewable; they are not a second way to make an implementation
pass.

## Precedence

1. Executable checks and CI are authoritative.
2. Root policy documents define repository-wide intent.
3. Nested `AGENTS.md` files may narrow or explain rules for their subtree, but
   may not weaken a root rule without an explicit exception.
4. Framework- or tool-required exceptions must be documented at the narrowest
   possible scope.

## Required exception record

Every suppression or enforcement change must include, in the same change:

- the exact rule, file, and scope;
- why the correct implementation cannot satisfy the rule;
- the owner responsible for removing the exception;
- a tracking issue or task;
- an expiry date when the exception is temporary;
- the replacement safety evidence, if the rule protects correctness.

Use the rule's inline suppression syntax only when configuration cannot express
the narrow scope. The comment must include a rationale after `--` or `:`.

```ts
// oxlint-disable-next-line typescript/no-unsafe-assignment -- vendor types are incorrect; owner: platform; issue: #123; expiry: 2026-12-31
```

Anonymous suppressions, file-wide disables, unexplained ignore entries, and
rule downgrades are invalid. `pnpm exceptions:check` checks source suppressions
for a rationale; reviewers must still verify scope, owner, issue, and expiry.

If a rule prevents a genuinely correct implementation, stop and document the
conflict. Do not silently weaken the rule.

## Current configuration registry

The following deliberate `off` rules are scoped overrides, not general
permission to weaken enforcement:

- `eslint/func-style`, `eslint/no-magic-numbers`, `eslint/sort-imports`, and
  `eslint/sort-keys` — canonical style is owned by the broader Oxlint presets.
- `import/no-relative-parent-imports`, `import/no-named-export`,
  `import/consistent-type-specifier-style`, `import/no-unassigned-import`, and
  `import/prefer-default-export` — repository conventions and framework entry
  points handle these cases.
- `react/react-in-jsx-scope`, `react/forbid-component-props`,
  `react/jsx-filename-extension`, `react/jsx-no-literals`,
  `react/jsx-max-depth`, and `react/jsx-props-no-spreading` — modern JSX or
  intentional component-library implementation boundaries.
- `typescript/prefer-readonly-parameter-types`,
  `typescript/no-confusing-void-expression`, and
  `typescript/consistent-type-imports` — not universally expressible across
  all supported project shapes.
- `vitest/no-importing-vitest-globals`, `vitest/require-test-timeout`, and
  `vitest/require-hook` — local test configuration owns these choices.
- `vitest/prefer-strict-boolean-matchers` — conflicts with the enabled
  `prefer-to-be-truthy` and `prefer-to-be-falsy` test canonical forms.
- `@rikalabs/no-unlisted-external-imports`,
  `@rikalabs/no-generic-module-names`, and
  `@rikalabs/no-placeholder-implementation` — reserved for projects that opt
  into those stricter repository-specific checks.
- `react-quality/forbid-component-props`,
  `react-quality/jsx-props-no-spreading`, `react-quality/react-in-jsx-scope`,
  `react/button-has-type`, `shadcn/no-restyle`, and
  `jsx-a11y/label-has-associated-control` — design-system implementation
  scope: `packages/ui/**`.
- `import/no-default-export` — configuration files only.
- `eslint/max-depth`, `eslint/max-lines`, `eslint/max-lines-per-function`,
  `eslint/max-params`, `eslint/max-statements`, `react/no-multi-comp`,
  `react-quality/no-giant-component`, and
  `react-quality/no-multi-component-file` — test files only.
- `eslint/require-await`, `typescript/require-await`, `vitest/no-hooks`, and
  `vitest/require-top-level-describe` — test setup only.
- `vitest/prefer-importing-vitest-globals` — end-to-end tests only.
- `@rikalabs/no-hardcoded-secrets`, `@rikalabs/no-low-signal-variable-names`,
  `@rikalabs/no-trivial-runtime-guard-helpers`, `eslint/curly`,
  `eslint/no-continue`, `eslint/no-console`, `eslint/no-undefined`,
  `eslint/one-var`, `eslint/prefer-destructuring`, `import/no-nodejs-modules`,
  `typescript/no-unnecessary-condition`, and `unicorn/import-style` — typed
  Node governance scripts and configuration files only.
- `eslint/no-restricted-imports`, `eslint/one-var`, `eslint/sort-vars`,
  `import/group-exports`, and `import/no-namespace` — database schema and
  client implementation only:
  Drizzle schema declarations have dependency order, and the adapter is the
  explicitly permitted owner of the restricted database imports.
- `eslint/no-restricted-properties` — generated migrations and explicitly
  marked database internals only; this is the narrow escape hatch for SQL
  syntax that cannot be expressed by Drizzle. Application and adapter source
  code must use parameterized `sql\`\`` or the typed query builder.

The current ignored paths are `dist`, `coverage`, and `node_modules`; they are
generated or dependency output and must never be used to hide source files.

The oRPC/Zod contract builder at `packages/core/src/api/contract.ts` disables
`eslint/one-var` and `unicorn/max-nested-calls` only because staged schema
construction is clearer and safer than flattening a contract into unrelated
helpers. Its input/output schemas and route remain runtime-validated.

The oRPC transport adapter at `packages/core/src/api/router.ts` disables
`@rikalabs/effect-no-async-await` and
`@rikalabs/effect-no-terminal-runners` because this is the explicit Effect
runtime boundary where a validated request becomes a transport Promise. The
Node telemetry layer disables `@rikalabs/effect-no-layer-in-leaf-modules`
because it is the runtime layer assembly point.

The root `prepare` script runs `effect-tsgo patch --oxlint --typescript` for
`@effect/tsgo` so the TypeScript 7 and Oxlint integrations use the Effect
diagnostics layer. This is a reviewed lifecycle exception owned by the
toolchain maintainers; `pnpm toolchain:check` verifies the active TS7 build and
that applying the patch twice is idempotent. It must not be expanded to run
application generators or access credentials.

The query-plan devtool keeps `unicorn/no-null` enabled everywhere else because
SQL `NULL` is a meaningful captured parameter value; it is disabled only in
`packages/db/src/query-capture.ts`, owned by database tooling maintainers.

The query-corpus report imports the database devtool source directly because
the root governance scripts execute from the workspace before package builds;
`@rikalabs/no-relative-cross-package-imports` is disabled only for
`scripts/report-query-corpus.ts`, owned by database tooling maintainers.

The query-plan runner is a deliberate database-tooling boundary. It owns the
single `postgres` connection used to execute read-only `EXPLAIN` statements,
serializes planner work to avoid load spikes, and uses conditional object
decoding for PostgreSQL's JSON plan shape. Its scoped exceptions cover the
driver import, sequential awaits, conditional decoding, and SQL-tooling
ternaries in `packages/db/scripts/run-query-plans.ts` and
`packages/db/scripts/prepare-query-plans.ts`.

The same query-plan runner scope disables `@rikalabs/no-trivial-property-helpers`,
`eslint/no-await-in-loop`, and `eslint/no-ternary`: planner requests are
intentionally decoded and serialized in explicit sequential tooling code.
