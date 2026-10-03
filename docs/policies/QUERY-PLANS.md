# Query Plans

Database query plans are captured from real test execution rather than
registered manually in application code.

## Capture model

`@template/db/devtools/query-plans` exposes `createQueryCapture()`, which
implements Drizzle's `Logger` interface. Pass its logger to `createDatabase`
only in an integration or E2E test harness:

```ts
import {
  createQueryCapture,
  writeQueryCorpus,
} from "@template/db/devtools/query-plans";

const capture = createQueryCapture({
  getSource: () => "orders.integration.test.ts:lists recent orders",
});
const database = createDatabase({ logger: capture.logger, url });
await writeQueryCorpus(".artifacts/query-corpus.json", capture.getCorpus());
```

The capture layer:

- normalizes only whitespace, preserving meaningful query-shape differences;
- fingerprints parameterized SQL with SHA-256;
- deduplicates repeated executions;
- records execution counts and test provenance;
- retains at most three parameter-shape samples per query;
- redacts parameter values by default.

The default sample is intentionally safe for uploaded test artifacts. A future
production-like plan runner may use generic plans by default and explicitly
opt into concrete values for skew-sensitive queries.

## Plan corpus sources

The pull-request corpus is captured independently from the base and proposed
test suites. The corpus is observational: ordinary tests exercise queries, and
the plan tool evaluates what actually ran. It does not require query
registration. A missing or empty capture fails the gate instead of silently
substituting a committed query list.

Production `pg_stat_statements` shapes may supplement scheduled analysis, but
they are not the baseline for a pull-request comparison. Uncovered dynamic
branches remain a test-coverage gap and must not be treated as proven safe.

The repository includes `devtools/query-plans/fixture.sql`, a sanitized, deterministic
planner fixture. It is deliberately data-shaped rather than a raw
`pg_statistic` dump: PostgreSQL's internal statistics catalogs are
version-sensitive and difficult to restore safely. The fixture is loaded and
`ANALYZE`d on a pinned PostgreSQL 18.3 server, which reconstructs planner
statistics reproducibly.

Query corpora and plans are execution artifacts under ignored `.artifacts/`,
not committed query lists or baselines. Pull-request CI plans the base and
proposed merge against fresh, isolated database states on the same pinned
PostgreSQL service. Fixtures, sizing assumptions, and risk thresholds remain
committed and reviewed.

## Policy boundary

Plan checks should distinguish generic-plan regressions from parameter-skew
cases and should compare normalized plan structure rather than exact costs.
Cost and row thresholds belong in a production-like PostgreSQL environment
with representative statistics, not in unit tests or source lint. The PR report
adds informational warnings for nested loops and sequential scans to prompt
review; these are not failures by themselves because both can be appropriate
for bounded or small relations.

The local gate is `pnpm test:integration`, also included in `pnpm check:all`.
It creates a disposable database, migrates and seeds it, runs integration and
browser tests with capture enabled, merges their corpus, and checks every plan.

For a prepared disposable database and freshly captured test shards:

```sh
pnpm db:query-corpus:merge
pnpm db:plans
```

The runner executes `EXPLAIN (FORMAT JSON, GENERIC_PLAN TRUE)` for every
captured query, stores the current plans in `.artifacts/query-plans.json`, and
emits `.artifacts/query-plans.md`. Local runs assess all captured queries as
new plans, blocking large scans and absolute high costs without a historical
baseline. Setting `QUERY_PLAN_BASELINE` explicitly enables comparison with a
fresh base artifact; a missing or invalid supplied baseline fails the run.
The comparison reports added, removed, changed, and unchanged plans, originating
test sources, plan shape, estimated rows, and cost. It evaluates unchanged SQL
as well, since schema and index changes can alter its plan. Changed entries
include both plans so the reason for the difference is reviewable.
Every added or changed query gets a visible risk marker:

- ✅ low — no material plan concern detected;
- 🟠 review — plan shape or a moderate scan/cost deserves investigation;
- 🔴 high — large sequential scan or material cost regression; the gate fails.

When `QUERY_PLAN_CAPTURE=1`, `@template/db` automatically attaches a process
capture logger to `createDatabase()`. Each test process writes a redacted
`.artifacts/query-corpus-<pid>.json` shard. CI merges those shards with
`pnpm db:query-corpus:merge`; `pnpm db:plans` requires the merged
`.artifacts/query-corpus.json` by default. `QUERY_PLAN_CORPUS` selects an
explicit captured artifact when needed. Missing or empty captures fail; there
is no committed-corpus fallback. Each verification run clears old capture
shards before executing its tests.

`QUERY_PLAN_ARTIFACT` and `QUERY_PLAN_OUTPUT` select output paths for the JSON
plans and Markdown report. They do not establish or overwrite a committed
baseline, and writing an artifact does not bypass plan risk checks.

## Pull-request reports

The report command compares two captured corpus artifacts and emits Markdown:

```sh
pnpm db:query-corpus:report baseline.json current.json
```

The required `Query Plans` CI job checks out the pull request's base commit and
proposed merge separately. For each side it resets the database, applies that
side's migrations and fixture, runs that side's tests with capture enabled,
and produces plans. The proposed runner plans both captured corpora against
their respective database states so this workflow also works when the base
still has the older runner. It then compares the two fresh artifacts, appends
the report to `GITHUB_STEP_SUMMARY`, and uploads both corpora and the scoped
plan artifacts for review. Removed queries remain visible, including removals
caused by lost test coverage. The workflow uses a read-only token, including
for fork pull requests.

## Disposable write targets

Reset and fixture preparation require a loopback `planner_*` database whose
name exactly matches `QUERY_PLAN_DISPOSABLE_DATABASE`. URL query overrides and
fragments are rejected before connecting. Ordinary development and product
databases cannot be seeded or reset through these commands. `pnpm check:all`
creates and cleans up its own unique Docker database.

Scan risk uses analyzed relation size, rather than filtered output rows. Both
base and current plans appear for cost or shape changes. Missing relation
statistics require investigation; absolute high cost, large scans and doubled
cost remain blocking evidence.
