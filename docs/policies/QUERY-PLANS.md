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

The default sample is intentionally safe for committed artifacts. A future
production-like plan runner may use generic plans by default and explicitly
opt into concrete values for skew-sensitive queries.

## Plan corpus sources

The long-term corpus has two sources:

1. test-captured query shapes for new or changed code;
2. periodically imported `pg_stat_statements` shapes for production relevance.

The corpus is observational: ordinary tests exercise queries, and the plan
tool evaluates what actually ran. It does not require query registration.
Uncovered dynamic branches remain a test-coverage gap and must not be treated
as proven safe.

The repository includes `devtools/query-plans/fixture.sql`, a sanitized, deterministic
planner fixture. It is deliberately data-shaped rather than a raw
`pg_statistic` dump: PostgreSQL's internal statistics catalogs are
version-sensitive and difficult to restore safely. The fixture is loaded and
`ANALYZE`d on a pinned PostgreSQL 18.3 server, which reconstructs planner
statistics reproducibly.

The committed `devtools/query-plans/baseline.json` contains normalized plans produced
from that fixture. It is evidence, not permission to ignore a new plan. When a
schema or query intentionally changes a plan, regenerate the baseline only
after reviewing the new plan and recording why the change is safe.

## Policy boundary

Plan checks should distinguish generic-plan regressions from parameter-skew
cases and should compare normalized plan structure rather than exact costs.
Cost and row thresholds belong in a production-like PostgreSQL environment
with representative statistics, not in unit tests or source lint.

The executable gate is:

```sh
pnpm db:plans:prepare
pnpm db:plans
```

The runner executes `EXPLAIN (FORMAT JSON, GENERIC_PLAN TRUE)` for every
captured query, stores the current plans in `.artifacts/query-plans.json`, and
emits `.artifacts/query-plans.md`. It reports added, changed, and unchanged
plans, originating test sources, plan shape, estimated rows, and cost. Every
added or changed query gets a visible risk marker:

- ✅ low — no material plan concern detected;
- 🟠 review — plan shape or a moderate scan/cost deserves investigation;
- 🔴 high — large sequential scan or material cost regression; the gate fails.

When `QUERY_PLAN_CAPTURE=1`, `@template/db` automatically attaches a process
capture logger to `createDatabase()`. Each test process writes a redacted
`.artifacts/query-corpus-<pid>.json` shard. CI merges those shards with
`pnpm db:query-corpus:merge` and `pnpm db:plans` automatically prefers the
merged `.artifacts/query-corpus.json`. The committed
`devtools/query-plans/corpus.json` is only a bootstrap fallback for this empty template.

To intentionally establish a reviewed baseline:

```sh
QUERY_PLAN_WRITE_BASELINE=1 pnpm db:plans
```

That command is never part of the normal CI gate. Agents must not use it to
make a failing plan disappear; the resulting baseline change must accompany
the query/schema rationale.

## Pull-request reports

The report command compares two captured corpus artifacts and emits Markdown:

```sh
pnpm db:query-corpus:report baseline.json current.json
```

The required `Query Plans` CI job runs the real PostgreSQL planner against the
fixture, appends the report to `GITHUB_STEP_SUMMARY`, and comments on same-
repository pull requests when the token can write comments. Forks still get
the required check and workflow summary without granting write permissions.
