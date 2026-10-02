import postgres from "postgres";
import { disposableDatabaseSchema } from "@template/db/devtools/query-plans";

const target = disposableDatabaseSchema.parse({
  url: process.env.QUERY_PLAN_DATABASE_URL,
  expectedDatabase: process.env.QUERY_PLAN_DISPOSABLE_DATABASE,
});
const { administrativeUrl, databaseName: targetDatabase } = target;
const sql = postgres(administrativeUrl, { max: 1, prepare: false });
try {
  await sql`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = ${targetDatabase}
      AND pid <> pg_backend_pid()
  `;
  await sql`DROP DATABASE IF EXISTS ${sql(targetDatabase)}`;
  await sql`CREATE DATABASE ${sql(targetDatabase)}`;
} finally {
  await sql.end({ timeout: 5 });
}
