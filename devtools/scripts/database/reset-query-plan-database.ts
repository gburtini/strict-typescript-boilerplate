import postgres from "postgres";

const databaseUrl = process.env.QUERY_PLAN_DATABASE_URL;
if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
  throw new TypeError("QUERY_PLAN_DATABASE_URL is required");
}

const databasePathMatch = /\/(?<databaseName>[a-zA-Z0-9_-]+)(?:[?#].*)?$/u.exec(
  databaseUrl,
);
const targetDatabase = databasePathMatch?.groups?.databaseName ?? "";
if (
  targetDatabase.length === 0 ||
  targetDatabase === "postgres" ||
  targetDatabase === "template0" ||
  targetDatabase === "template1"
) {
  throw new TypeError(`Refusing to reset protected database: ${targetDatabase}`);
}

const administrativeUrl = databaseUrl.replace(
  /\/[a-zA-Z0-9_-]+(?=[?#]|$)/u,
  "/postgres",
);
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
