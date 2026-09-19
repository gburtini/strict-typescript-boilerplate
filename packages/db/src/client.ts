import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./schema";

interface DatabaseOptions {
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
  const db = drizzle(sql, { schema: databaseSchema });

  return {
    close: async () => {
      await sql.end({ timeout: 5 });
    },
    db,
  };
}

export type { DatabaseClient, DatabaseOptions };
