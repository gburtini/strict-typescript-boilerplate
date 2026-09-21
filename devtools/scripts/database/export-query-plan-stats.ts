import { mkdir, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import postgres from "postgres";
import { z } from "zod";
import { productionStatsSchema } from "@template/db/devtools/query-plans";
import { repositoryRoot } from "../shared/repository-paths.ts";

// The planner must model production-sized relations without connecting CI to
// Production. Export only table-size estimates, review the result, and commit
// It as the planner input when a production snapshot is intentionally adopted.

interface TableStatistics {
  readonly estimatedPages: number;
  readonly estimatedRows: number;
  readonly name: string;
}

const tableStatisticsRowSchema = z.object({
  estimatedPages: z.union([z.number(), z.string()]),
  estimatedRows: z.union([z.number(), z.string()]),
  name: z.string(),
});
const databaseVersionRowSchema = z.object({ version: z.string() });

function readTableStatistics(candidate: unknown): TableStatistics {
  const table = tableStatisticsRowSchema.safeParse(candidate);
  if (!table.success) {
    throw new TypeError("PostgreSQL returned an invalid table statistic");
  }
  const { estimatedPages, estimatedRows, name } = table.data;
  const pageCount = Number(estimatedPages);
  const rowCount = Number(estimatedRows);
  if (
    typeof name !== "string" ||
    !Number.isFinite(pageCount) ||
    pageCount < 0 ||
    !Number.isFinite(rowCount) ||
    rowCount < 0
  ) {
    throw new TypeError("PostgreSQL returned an invalid table statistic");
  }
  return {
    estimatedPages: pageCount,
    estimatedRows: rowCount,
    name,
  };
}

const databaseUrl = process.env.QUERY_PLAN_DATABASE_URL;
if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
  throw new TypeError("QUERY_PLAN_DATABASE_URL is required");
}

const outputPath = nodePath.resolve(
  repositoryRoot,
  process.env.QUERY_PLAN_STATS_OUTPUT ?? ".artifacts/production-stats.json",
);
const sql = postgres(databaseUrl, { max: 1, prepare: false });
try {
  const versionRows: readonly unknown[] = await sql.unsafe(
    "SELECT current_setting('server_version') AS version",
  );
  const tableRows: readonly unknown[] = await sql.unsafe(
    'SELECT relname AS name, n_live_tup::bigint AS "estimatedRows", relpages::bigint AS "estimatedPages" FROM pg_stat_user_tables WHERE schemaname = \'public\' ORDER BY relname',
  );
  const [versionRow] = versionRows;
  let databaseVersion = "unknown";
  const version = databaseVersionRowSchema.safeParse(versionRow);
  if (version.success) {
    databaseVersion = version.data.version;
  }
  const tables = tableRows.map((table) => readTableStatistics(table));
  await mkdir(nodePath.dirname(outputPath), { recursive: true });
  const statistics = productionStatsSchema.parse({
    databaseVersion,
    source: "pg_stat_user_tables",
    tables,
    version: 1,
  });
  await writeFile(outputPath, `${JSON.stringify(statistics)}\n`, "utf8");
} finally {
  await sql.end({ timeout: 5 });
}
