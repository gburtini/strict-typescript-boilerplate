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

## Inline source suppressions

For an inline suppression, record in the same change:

- the exact rule, file, and scope;
- why the correct implementation cannot satisfy the rule;
- the owner responsible for removing the exception;
- a tracking issue or task;
- an expiry date when the exception is temporary;
- the replacement safety evidence, if the rule protects correctness.

Use the rule's inline suppression syntax only when `.oxlintrc.jsonc` cannot
express the narrow scope. The comment must include a rationale after `--` or
`:`.

```ts
// oxlint-disable-next-line typescript/no-unsafe-assignment -- vendor types are incorrect; owner: platform; issue: #123; expiry: 2026-12-31
```

Anonymous suppressions, file-wide disables, unexplained ignore entries, and
rule downgrades are invalid. `pnpm suppressions:check` checks source
suppressions for rationale, owner, tracking and expiry fields.

Oxlint has one source of truth: `.oxlintrc.jsonc`. Keep rules, ignores, and
necessary scoped overrides there. Do not mirror config entries into a second
exception registry or generated manifest. Keep overrides only for concrete
framework, tool, or test boundaries; fix the code or remove a rule when the
rule cannot express a useful invariant. Add a short reason beside each override
in that config; do not maintain a separate justification list.

If a rule prevents a genuinely correct implementation, stop and document the
conflict. Do not silently weaken the rule.

Semgrep boundary permissions use `devtools/quality/semgrep/permissions.json`.
They must match the rule's exact file exclusions and include reason, owner,
tracking, and fixture evidence. Temporary permissions include an expiry date.
`pnpm semgrep:check` validates this registry and proves that each permitted
operation fails when its permission is removed. Inline
Semgrep suppressions do not disable enforcement. Universal rules cannot carry
exclusions without an explicit, reviewed change to their boundary contract.

The root `prepare` script runs `effect-tsgo patch --oxlint --typescript` for
`@effect/tsgo` so the TypeScript 7 and Oxlint integrations use the Effect
diagnostics layer. This is a reviewed lifecycle exception owned by the
toolchain maintainers; `pnpm toolchain:check` verifies the active TS7 build and
that applying the patch twice is idempotent. It must not be expanded to run
application generators or access credentials.

The Jev semantic-lint prototype pins `ai@7.0.105` because Vercel's
`experimental_evaluate` entry point is available from that release. Its exact
AI SDK transitive versions have aged past pnpm's seven-day minimum release age,
so they need no freshness exception. Jev evaluation is advisory. CI submits
synthetic fixtures from reviewed main only; source evaluation requires explicit
authorization. An unavailable evaluation cannot be reported as clean semantic
evidence.

Database tooling and governance scripts receive the same lint policy as
application code. They must use the public package entry points, satisfy the
same control-flow rules, and fix their types rather than adding a scoped
exception.
