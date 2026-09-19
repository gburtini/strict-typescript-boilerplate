# Design-system components

This directory implements reusable UI primitives for the workspace.

- Verify an existing primitive cannot express the behavior before adding one.
- Prefer extending an existing variant when the semantics match.
- Preserve accessibility behavior and existing public APIs unless the task
  explicitly changes them.
- Keep appearance ownership here: callers should receive variants, not raw
  implementation details.
- Do not add application-specific business concepts to this package.
- Run `pnpm check` after changes; do not weaken the package lint overrides.

The local shadcn overrides exist only because this directory owns primitive
appearance and prop forwarding. They do not authorize raw colors or unsafe
behavior.
