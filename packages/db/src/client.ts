import { drizzle } from "drizzle-orm/postgres-js";
import type { Logger } from "drizzle-orm";
import postgres from "postgres";
import { users } from "./schema";

interface DatabaseOptions {
  readonly logger?: Logger;
  readonly maxConnections?: number;
  readonly url: string;
}

interface DatabaseClient {
  readonly close: () => Promise<void>;
  readonly db: ReturnType<typeof drizzle<typeof databaseSchema>>;
}

const databaseSchema = { users };

export function createDatabase(options: DatabaseOptions): DatabaseClient {
  const sql = postgres(options.url, {
    max: options.maxConnections ?? 10,
    prepare: false,
  });
  const config = { schema: databaseSchema };
  if (options.logger) {
    Object.assign(config, { logger: options.logger });
  }
  const db = drizzle(sql, config);

  return {
    close: async () => {
      await sql.end({ timeout: 5 });
    },
    db,
  };
}

export type { DatabaseClient, DatabaseOptions };
