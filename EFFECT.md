# Effect runtime

Effect is the canonical runtime model for application and domain computations
that can fail, retry, cancel, or emit spans. Concrete I/O belongs in adapters
and is injected at the boundary.

The repository ships TypeScript 7 as the active compiler gate. `tsc` in every
typecheck command is TypeScript 7. The `@typescript/typescript6` compatibility
package remains installed for ecosystem tools that still need the TypeScript 6
compiler API; it is not the repository's type-checking authority.

`@effect/tsgo` patches the TypeScript and Oxlint integrations during install so
Effect diagnostics use the same native compiler path as the repository gate.
The patch is deliberately part of `prepare`, making a fresh install reproduce
the same toolchain.

Use the core helpers for the baseline semantics:

- `retryWithPolicy` for bounded retries.
- `withSpan` for operation-level tracing.
- `ApplicationError` for translated application failures.
- `InfrastructureError` for adapter failures with a named boundary.
- `recordFailure` for active-span exception reporting.

Terminal runners belong at runtime composition roots. They are not allowed in
domain or application modules.
