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
