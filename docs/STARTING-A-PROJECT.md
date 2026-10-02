# Start a project

The template stays generic. Perform these steps in each new project.

## Initialize identities

Start with a clean checkout and the pinned nvm runtime. Put configuration outside
the checkout, or in an untracked file:

```json
{
  "name": "sample-project",
  "scope": "@sample",
  "title": "Sample Project",
  "database": "sample_project"
}
```

```sh
pnpm init:project /absolute/path/project.json
pnpm install --frozen-lockfile
pnpm browser:install
pnpm check:all
```

Initialization validates all values before writing, updates imports, workspace
names, runtime defaults and policy references together, and regenerates the
lockfile through pnpm without changing dependency versions. Migration history
and recorded test failure artifacts keep their original identities. The command
rejects tracked local changes and a second initialization. Review the resulting
diff and commit initialization before product work.

## Develop

```sh
pnpm dev
```

This creates a disposable loopback Postgres container, discovers its assigned
port, applies migrations, enables the registration example, and starts Vite.
Stopping the command removes its own database and volume. Data is temporary.

For a database you manage, apply migrations with its `DATABASE_URL`, then run
`REFERENCE_API_ENABLED=true DATABASE_URL=... pnpm dev:web`. The public example
accepts only loopback database URLs. Product authentication, authorization and
remote database access require explicit product design before deployment.

## Build and run

```sh
pnpm build
HOST=0.0.0.0 PORT=8080 pnpm start
```

The build produces browser assets and a Node entry in `apps/web/dist/server/`.
Runtime dependencies are bundled. Copy the complete `apps/web/dist/` directory
and run `node dist/server/main.mjs` with the pinned Node version. The server serves browser assets, handles
oRPC under `/api`, checks readiness at `/readyz`, and drains requests before
closing the database and flushing telemetry on SIGTERM/SIGINT. API enablement is
explicit; the example remains disabled by default. `pnpm test:e2e` exercises this
built Node server.

`TELEMETRY_SERVICE_NAME` defaults to application package metadata;
`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` selects the collector. Exported exception
payloads and query parameters are redacted. TLS, routing and process supervision
belong to the deployment environment. Apply committed migrations as a release
step before starting a database-enabled service.

## Activate repository governance

Import `.github/rulesets/default-branch.json` in the new repository's branch
rulesets settings. Select the actual default branch and verify both required
check contexts after a real pull request. Keep the bypass list empty, require an
independent approver, and grant agents branch write access without administrator
or approval authority. This file prepares settings; it does not activate them.

Record the settings verification date and accountable review roles in
`docs/policies/GOVERNANCE.md`. Protected enforcement changes still need an
independent reviewer of the trusted comparison, even when local checks pass.

Complete the product, security, tenancy, design, compatibility and operational
decisions listed in the README before implementation depends on them.
