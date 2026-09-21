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

- `eslint/func-style`, `eslint/no-magic-numbers`, `eslint/one-var`,
  `eslint/sort-imports`, `eslint/sort-keys`, and `eslint/sort-vars` — these
  low-signal declaration-order rules are not part of the repository's
  correctness or canonical-form contract.
- `unicorn/max-nested-calls` — schema and configuration construction often
  nests declarative builders; correctness is enforced by the resulting Zod
  schema and the typed value it produces, not by flattening the declaration.
- `import/no-relative-parent-imports`, `import/no-named-export`, and
  `import/prefer-default-export` — repository conventions and framework entry
  points handle these cases.
- `react/react-in-jsx-scope`, `react/forbid-component-props`,
  `react/jsx-filename-extension`, `react/jsx-no-literals`,
  `react/jsx-max-depth`, and `react/jsx-props-no-spreading` — modern JSX or
  intentional component-library implementation boundaries.
- `typescript/prefer-readonly-parameter-types` — not universally expressible
  across all supported project shapes.
- `vitest/no-importing-vitest-globals`, `vitest/require-test-timeout` — local
  test configuration owns these choices.
- `vitest/require-hook` — disabled globally to neutralize the Vitest plugin
  default, then enabled for all repository test-file globs.
- `vitest/prefer-to-be-falsy`, `vitest/prefer-to-be-truthy` — strict boolean
  matchers are the canonical test assertion form.
- `@rikalabs/no-unlisted-external-imports`,
  `@rikalabs/no-generic-module-names`, and
  `@rikalabs/no-placeholder-implementation` — reserved for projects that opt
  into those stricter repository-specific checks.
- `react-quality/forbid-component-props`,
  `react-quality/jsx-props-no-spreading`, `react-quality/react-in-jsx-scope`,
  and `shadcn/no-restyle` — design-system implementation scope:
  `packages/ui/**`.
- `jsx-a11y/label-has-associated-control` — the shared label primitive owns
  its association behavior: `packages/ui/src/components/ui/label.tsx`.
- `import/no-default-export` — configuration files only.
- `react/no-multi-comp`,
  `react-quality/no-giant-component`, and
  `react-quality/no-multi-component-file` — test files only.
- `eslint/require-await`, `typescript/require-await`, `vitest/no-hooks`, and
  `vitest/require-top-level-describe` — test setup only.
- `vitest/prefer-importing-vitest-globals` — end-to-end tests only.
- `eslint/no-restricted-imports`, `import/group-exports`, and
  `import/no-namespace` — database schema and
  client implementation only:
  Drizzle schema declarations have dependency order, and the adapter is the
  explicitly permitted owner of the restricted database imports.
- `eslint/no-restricted-properties` — generated migrations and explicitly
  marked database internals only; this is the narrow escape hatch for SQL
  syntax that cannot be expressed by Drizzle. Application and adapter source
  code must use parameterized `sql\`\`` or the typed query builder.

The current ignored paths are `dist`, `coverage`, and `node_modules`; they are
generated or dependency output and must never be used to hide source files.

The oRPC transport adapter at `packages/core/src/api/router.ts` disables
`@rikalabs/effect-no-async-await` and
`@rikalabs/effect-no-terminal-runners` because it is visibly an adapter from
oRPC's Promise-based handler API into an Effect program. The terminal runner
belongs exactly at this transport boundary: it converts the validated Effect
result back into the Promise required by oRPC. It must not move inward into
application or domain modules.

The Node telemetry layer at `packages/core/src/telemetry-node.ts` disables
`@rikalabs/effect-no-layer-in-leaf-modules` because the file is literally the
Node runtime telemetry-layer assembly point. The exception is limited to that
adapter and does not permit Effect layers in application or domain leaves.

The root `prepare` script runs `effect-tsgo patch --oxlint --typescript` for
`@effect/tsgo` so the TypeScript 7 and Oxlint integrations use the Effect
diagnostics layer. This is a reviewed lifecycle exception owned by the
toolchain maintainers; `pnpm toolchain:check` verifies the active TS7 build and
that applying the patch twice is idempotent. It must not be expanded to run
application generators or access credentials.

The query-plan devtool keeps `unicorn/no-null` enabled everywhere else because
SQL `NULL` is a meaningful captured parameter value; it is disabled only in
`packages/db/src/query-capture.ts`, owned by database tooling maintainers.

The Jev semantic-lint prototype pins `ai@7.0.105` because Vercel's
`experimental_evaluate` entry point is available from that release. Its
currently required AI SDK transitive versions are individually listed in
`pnpm-workspace.yaml`'s minimum-release-age exclusions; no package family is
exempted. Owner: repository maintainers. Tracking task: branch
`codex/jev-semantic-lint`. Expiry: 2026-09-30; remove the exact-version
exclusions after review and once the releases have aged past the seven-day
gate. Jev evaluates pull-request diffs and may also be run locally; inability
to evaluate a pull-request diff is a failed check.

Database tooling and governance scripts receive the same lint policy as
application code. They must use the public package entry points, satisfy the
same control-flow rules, and fix their types rather than adding a scoped
exception.
