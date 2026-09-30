# Database

`@template/db` is the only package that owns the Drizzle client, PostgreSQL
driver, schema definitions, and migrations. It is an infrastructure adapter,
not a domain model package.

## Required choices

- PostgreSQL is the supported database dialect.
- Table and column names use lowercase `snake_case`; TypeScript properties use
  `camelCase`.
- Points in time use PostgreSQL `timestamptz` and Drizzle
  `timestamp(..., { withTimezone: true })`.
- Text uses `text`; use a database `check` constraint when length matters.
- Monetary values use `numeric`, never PostgreSQL `money` or floating point.
- New identifiers use UUIDs and primary keys are non-null and explicit.
- Foreign keys, unique constraints, check constraints, and indexes are part of
  the schema contract, not application-only assumptions.
- Every persisted input crossing the adapter boundary is validated with the
  repository's Zod/Drizzle-Zod schema.

## Query rules

- Application and domain code must not import `drizzle-orm` or `postgres`.
- Database access goes through injected repositories or ports; do not create a
  global database singleton or service locator.
- Use Drizzle's typed query builder. Raw SQL is reserved for migrations or a
  database feature that Drizzle cannot express, and requires a local rationale.
- Never interpolate user input into SQL. Parameterization is mandatory.
- Select explicit columns; `select *` is not a production query contract.
- Use keyset pagination for large or user-facing collections. Do not introduce
  offset pagination for an unbounded table.
- Multi-step writes use an explicit transaction. A transaction must not include
  network calls, filesystem work, or other non-database side effects.
- Bound every collection query with a deliberate limit or pagination contract.
- Add indexes for observed query patterns and verify them with query plans; do
  not add speculative indexes.

Choose the narrowest Drizzle API that matches the query:

| Query shape                      | Required API                               |
| -------------------------------- | ------------------------------------------ |
| Simple CRUD and relational reads | Drizzle relational query API               |
| Complex SQL and aggregation      | Drizzle query builder                      |
| SQL unsupported by Drizzle       | Parameterized `sql\`...\`` tagged SQL      |
| Any dynamic SQL text             | Prohibited; `sql.raw()` is never permitted |

`drizzle/enforce-delete-with-where` and
`drizzle/enforce-update-with-where` are errors. The repository also rejects
`sql.raw()` and direct Drizzle/Postgres imports outside the database adapter.
The static checks cannot prove every query is bounded or every multi-write is
atomic, so those requirements remain mandatory review and test invariants.

## Schema and migration rules

- `packages/db/src/schema.ts` is the source of truth for the schema.
- `pnpm db:generate` creates migrations; generated SQL and metadata are
  committed and reviewed together.
- Never edit an applied migration. Add a new migration for corrections.
- Migrations are expand/contract by default: add compatible structures first,
  deploy code that can read both versions, backfill safely, then remove old
  structures in a later migration.
- Destructive changes, large backfills, and lock-heavy index operations require
  an explicit rollout and rollback plan.
- Production index creation must use the concurrently-safe approach supported
  by the database and migration tooling.
- `pnpm db:migrations:check` runs both Drizzle metadata validation and a
  disposable regeneration comparison. It fails when the committed migration
  tree is stale, incomplete, or inconsistent with the schema.
- `pnpm generated:check` remains required for the repository-wide generated-file
  contract.

## Tenancy and authorization

Derive authorized scope on the server. Require tenant identity in tenant-owned
repository ports and every read, write, join, and uniqueness condition. Enforce
same-tenant relationships with composite foreign keys where possible. Test
cross-tenant reads, writes, and relationships against the real adapter. UUIDs,
parsed schemas, and hidden controls are not permission. Document intentionally
public/global tables. Test row-level security using the deployed non-owner role;
verify pooled connections cannot retain a previous tenant's context.

## Concurrency and atomicity

Name the invariant and isolation requirement before choosing a transaction.
Use database constraints for races; avoid read-then-write checks that can both
pass concurrently. Use conditional updates or optimistic versions against lost
updates. Bound transaction lifetime and acquire locks consistently. Retry only
documented transient failures with bounded backoff and idempotent operations;
an ambiguous commit cannot be blindly retried. Use an outbox and idempotent
consumers for external delivery after a commit. Keep network calls outside
transactions.

## Data and query contracts

Define pagination order with a unique tie-breaker; test duplicate sort values,
inserts between pages, and end-of-list behavior. Cap page sizes on the server.
Use half-open time ranges (`>= start`, `< end`). Represent currency and exact
decimals deliberately across transport boundaries. Document rounding, precision,
nullability, and timezone semantics. Validate JSONB through a versioned domain
schema. Keep ORM models out of domain and public transport contracts. Review
index write/storage cost as well as observed read plans.

## Migration and operational evidence

Record affected relations, expected scale, lock behavior, deployed reader/writer
compatibility, rollout order, and recovery limits. Test from the previously
deployed schema and from an empty database. Backfill in resumable bounded batches
with progress and reconciliation, separately from startup and short migrations.
Set deliberate lock/statement timeouts. Concurrent indexes require execution
outside a transaction; verify index validity after interruption before retrying.
Do not claim rollback recovers dropped data. Exercise restore procedures with
sanitized backups and record recovery objectives and an accountable operator.

Use least-privilege runtime roles, a separate migration role, verified transport
encryption, bounded pools, and explicit shutdown. Monitor pool waits, query
latency/failures, lock waits, replication lag where applicable, and vacuum health.
Export query shapes rather than parameters. `EXPLAIN ANALYZE` executes statements;
use disposable data and obtain authorization for production diagnostics. Generic
plans do not prove parameter-skew behavior; provide representative skew evidence.

## Lifecycle

`createDatabase` receives its URL and pool settings explicitly and returns a
closeable client. Runtime startup owns the client lifetime. Tests should inject
an in-memory repository or a disposable database adapter; they must not mock
Drizzle query chains.

Every query or index change must be reviewed against the production-like planner
fixture. Follow the capture, comparison, and baseline rules in
[`QUERY-PLANS.md`](QUERY-PLANS.md).

## Local PostgreSQL

The template supplies a disposable PostgreSQL service in `compose.yaml`.
Projects must change the database and volume identity during initialization,
but should retain the health check, pinned major version, explicit host-port
override, and documented destructive reset command. Local credentials are for
development only and must never be reused by a deployed environment.
