# Enforcement review: boilerplate readiness

The template remains generic; no hosted settings or external services were
changed. No dependency versions, graph edges or query baselines were changed.

## Acceptance changes

- Planner reset and fixture preparation now reject ordinary database names,
  remote hosts, URL overrides and missing or mismatched disposable identity.
  Verification creates a unique `planner_*` database; CI uses `planner_ci`.
- Sequential scan checks now use analyzed relation cardinality, including
  selective and parallel scans. Missing statistics fail capture. Cost changes
  appear with their previous plan even when shape is unchanged. Absolute high
  cost now blocks the gate, matching the report's risk legend.
- Core collector integration runs in the real integration gate; the unit runner
  excludes those service tests and has an explicit replacement command.
- Initialization gains positive and negative fixtures in the static gate.
- Browser workflows run the built Node entry directly so graceful shutdown
  finishes before analysis. Capture uses an absolute artifact path and the gate
  requires a new browser API query shard. Preview remains a development convenience.
- `node:http` is permitted for Node HTTP composition and core collector tests.
  A dependency-cruiser rule rejects it elsewhere, with negative evidence for
  application code. Existing browser and domain Node restrictions remain active.
- `node:events` supports resource lifecycle synchronization. The development entry sets explicit runtime configuration through `env`
  and inherits the process environment without reading it. Semgrep rejects
  direct environment access there, as well as in application and domain modules.

No checks were removed, severities lowered, suppressions added, or warning
thresholds relaxed. The transport error conversion lives outside Effect
execution and retains original causes without serializing private failure data.
Independent review of these protected contracts remains required in each fork.
