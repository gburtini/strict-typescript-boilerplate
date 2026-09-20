import { readFile } from "node:fs/promises";
import nodePath from "node:path";
import postgres from "postgres";

const repositoryRoot = nodePath.resolve(import.meta.dirname, "../../..");

const databaseUrl = process.env.QUERY_PLAN_DATABASE_URL;
if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
  throw new TypeError("QUERY_PLAN_DATABASE_URL is required");
}

const fixture = await readFile(
  nodePath.resolve(repositoryRoot, "query-plans/fixture.sql"),
  "utf8",
);
const sql = postgres(databaseUrl, { max: 1, prepare: false });
try {
  await sql.unsafe(fixture);
} finally {
  await sql.end({ timeout: 5 });
}
