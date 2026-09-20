import { readFile } from "node:fs/promises";
import nodePath from "node:path";
import postgres from "postgres";
import { productionStatsSchema } from "../src/devtools/query-plan-stats.js";

const repositoryRoot = nodePath.resolve(import.meta.dirname, "../../..");

const databaseUrl = process.env.QUERY_PLAN_DATABASE_URL;
if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
  throw new TypeError("QUERY_PLAN_DATABASE_URL is required");
}

const fixture = await readFile(
  nodePath.resolve(repositoryRoot, "query-plans/fixture.sql"),
  "utf8",
);
// The fixture is deliberately sized from an imported production statistics
// Snapshot. Query plans must represent the relation sizes an agent is likely
// To encounter, rather than passing against a deceptively tiny empty table.
const statisticsDocument = await readFile(
  nodePath.resolve(repositoryRoot, "query-plans/production-stats.json"),
  "utf8",
);
const statistics = productionStatsSchema.parse(JSON.parse(statisticsDocument));
const usersStatistics = statistics.tables.find((table) => table.name === "users");
if (!usersStatistics || usersStatistics.estimatedRows < 1) {
  throw new TypeError("production stats must include a positive users estimate");
}
const preparedFixture = fixture.replaceAll(
  "__USERS_ESTIMATED_ROWS__",
  String(Math.ceil(usersStatistics.estimatedRows)),
);
const sql = postgres(databaseUrl, { max: 1, prepare: false });
try {
  await sql.unsafe(preparedFixture);
} finally {
  await sql.end({ timeout: 5 });
}
