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

## Policy boundary

Plan checks should distinguish generic-plan regressions from parameter-skew
cases and should compare normalized plan structure rather than exact costs.
Cost and row thresholds belong in a production-like PostgreSQL environment
with representative statistics, not in unit tests or source lint.

## Pull-request reports

The report command compares two captured corpus artifacts and emits Markdown:

```sh
pnpm db:query-corpus:report baseline.json current.json
```

CI can append that output to `GITHUB_STEP_SUMMARY` or a PR comment. This first
report identifies added, removed, and unchanged query shapes. A later
production-like PostgreSQL job can extend the same report with normalized
`EXPLAIN` plan changes and fail only on policy violations.
