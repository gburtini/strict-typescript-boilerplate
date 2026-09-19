# Compatibility and Evolution

Code that crosses a package, deployment, storage, or event boundary is a
long-lived contract.

## Public APIs

- Treat package exports, HTTP APIs, CLI behavior, events, and persisted schemas
  as public once another deployable component consumes them.
- Classify changes as additive, compatible behavior changes, or breaking
  changes before implementation.
- Follow semantic versioning for published packages and document deprecations
  before removal.
- Keep compatibility shims only while a concrete consumer still requires them;
  record the removal condition and owner.

## Deployments and migrations

Database and persisted-data changes must support mixed-version operation during
deployment. Prefer expand, migrate, then contract:

1. add the new representation without removing the old one;
2. deploy readers and writers that understand both versions;
3. backfill or migrate with observable progress and rollback planning;
4. remove the old representation only after consumers are gone.

Every migration needs an explicit forward path, rollback or recovery plan, and
verification for partial failure. Event and serialized-schema changes need a
versioning strategy and fixtures for old and new payloads.

## Release evidence

Changes to a public or persisted contract must document rollout order,
mixed-version behavior, rollback limits, and the condition for removing old
compatibility code. “The current checkout typechecks” is not sufficient
evidence for a contract that outlives one deployment.
