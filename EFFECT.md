# Effect runtime

Effect is the canonical runtime model for application and domain computations
that can fail, retry, cancel, or emit spans. Concrete I/O belongs in adapters
and is injected at the boundary.

The repository includes `@effect/tsgo` as an opt-in developer tool. The active
compiler gate remains TypeScript 6 because tsgo currently requires the
TypeScript 7 native preview. When the repository moves to that compiler, add
the tsgo configuration and make its diagnostics a required check in the same
increment; do not silently run two competing type systems.

Use the core helpers for the baseline semantics:

- `retryWithPolicy` for bounded retries.
- `withSpan` for operation-level tracing.
- `ApplicationError` for translated application failures.
- `InfrastructureError` for adapter failures with a named boundary.
- `recordFailure` for active-span exception reporting.

Terminal runners belong at runtime composition roots. They are not allowed in
domain or application modules.
