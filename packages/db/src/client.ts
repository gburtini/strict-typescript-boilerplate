import { drizzle } from "drizzle-orm/postgres-js";
import type { Logger } from "drizzle-orm";
import postgres from "postgres";
import { getProcessQueryCapture } from "./devtools/query-plans";
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
  const config: { logger?: Logger; schema: typeof databaseSchema } = {
    schema: databaseSchema,
  };
  const { logger: providedLogger } = options;
  let logger = providedLogger;
  if (!logger && process.env.QUERY_PLAN_CAPTURE === "1") {
    const { logger: capturedLogger } = getProcessQueryCapture();
    logger = capturedLogger;
  }
  if (logger) {
    config.logger = logger;
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
