import { defineConfig } from "drizzle-kit";
import { env } from "./src/env";

export default defineConfig({
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  dialect: "postgresql",
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations",
  },
  out: "./packages/db/drizzle",
  schema: "./packages/db/src/schema.ts",
  strict: true,
  verbose: true,
});
