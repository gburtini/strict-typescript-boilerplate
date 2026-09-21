# Telemetry

Telemetry is an infrastructure concern. Application and domain code may add
semantic spans through `withSpan` and report failures through `recordFailure`,
but must not construct exporters, read telemetry credentials, or depend on a
specific collector.

## Effect integration

`@template/core` exposes `TelemetryLive` for Node runtimes and `withSpan` for
Effect computations. `TelemetryLive` is configured by the runtime entrypoint,
which must provide the deployed service name from its own package metadata or
typed runtime configuration. The runtime entrypoint owns exporter registration
and resource configuration. A browser application should provide its own
browser adapter rather than importing the Node layer.

Every failed operation must preserve its original cause. Wrapped errors use
the standard `cause` property, and telemetry records the underlying `Error`
when one exists.

## Boundaries

- Do not log secrets, tokens, request bodies, or unredacted personal data.
- Use stable semantic attributes; never use raw user input as a span name.
- Keep high-cardinality values out of metric labels and span attributes.
- Instrument application boundaries and external adapters, not every helper.
- Do not make business behavior depend on telemetry being available.

## Failure behavior

Telemetry must be best effort. An exporter outage must not turn a successful
business operation into a failure. Adapter code still reports the failure to
the configured observability mechanism and preserves the original cause for
the application error path.
