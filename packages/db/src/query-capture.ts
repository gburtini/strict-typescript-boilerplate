import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { Logger } from "drizzle-orm";

const maximumParameterSamples = 3;

interface QueryCorpusEntry {
  readonly executions: number;
  readonly fingerprint: string;
  readonly parameterSamples: readonly (readonly unknown[])[];
  readonly sql: string;
  readonly testSources: readonly string[];
}

interface QueryCorpus {
  readonly queries: readonly QueryCorpusEntry[];
  readonly version: 1;
}

interface QueryCaptureOptions {
  readonly getSource?: () => string | undefined;
  readonly maximumParameterSamples?: number;
}

interface QueryCapture {
  readonly getCorpus: () => QueryCorpus;
  readonly logger: Logger;
}

interface QueryCorpusDiff {
  readonly added: readonly QueryCorpusEntry[];
  readonly removed: readonly QueryCorpusEntry[];
  readonly unchanged: readonly QueryCorpusEntry[];
}

function jsonIdentity(_key: string, jsonValue: unknown): unknown {
  return jsonValue;
}

function serializeQueryCorpus(corpus: QueryCorpus): string {
  return `${JSON.stringify(corpus, jsonIdentity, 2)}\n`;
}

async function writeQueryCorpus(path: string, corpus: QueryCorpus): Promise<void> {
  await writeFile(path, serializeQueryCorpus(corpus), "utf8");
}

function normalizeSql(sql: string): string {
  return sql.replaceAll(/\s+/gu, " ").trim();
}

function summarizeParameter(parameterValue: unknown): unknown {
  if (
    Object.is(parameterValue, null) ||
    typeof parameterValue === "boolean" ||
    typeof parameterValue === "number"
  ) {
    return parameterValue;
  }
  if (typeof parameterValue === "string") {
    return `<string:${parameterValue.length}>`;
  }
  if (parameterValue instanceof Date) {
    return "<date>";
  }
  if (parameterValue instanceof Uint8Array) {
    return `<bytes:${parameterValue.byteLength}>`;
  }
  if (Array.isArray(parameterValue)) {
    return `<array:${parameterValue.length}>`;
  }
  if (typeof parameterValue === "object") {
    return "<object>";
  }
  return `<${typeof parameterValue}>`;
}

function fingerprintSql(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

function diffQueryCorpus(baseline: QueryCorpus, current: QueryCorpus): QueryCorpusDiff {
  const baselineQueries = new Map(
    baseline.queries.map((entry) => [entry.fingerprint, entry]),
  );
  const currentQueries = new Map(
    current.queries.map((entry) => [entry.fingerprint, entry]),
  );

  return {
    added: current.queries.filter((entry) => !baselineQueries.has(entry.fingerprint)),
    removed: baseline.queries.filter((entry) => !currentQueries.has(entry.fingerprint)),
    unchanged: current.queries.filter((entry) =>
      baselineQueries.has(entry.fingerprint),
    ),
  };
}

function renderQueryCorpusDiff(diff: QueryCorpusDiff): string {
  const lines = [
    "## Database query-shape changes",
    "",
    `- Added: ${diff.added.length}`,
    `- Removed: ${diff.removed.length}`,
    `- Unchanged: ${diff.unchanged.length}`,
  ];

  if (diff.added.length > 0) {
    lines.push("", "### Added queries", "");
    for (const entry of diff.added) {
      lines.push(`- \`${entry.fingerprint.slice(0, 12)}\`: ${entry.sql}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function createQueryCapture(options: QueryCaptureOptions = {}): QueryCapture {
  const entries = new Map<
    string,
    {
      executions: number;
      parameterSamples: unknown[][];
      sql: string;
      testSources: Set<string>;
    }
  >();
  const maximumSamples = options.maximumParameterSamples ?? maximumParameterSamples;

  const logger: Logger = {
    logQuery(query, params) {
      const sql = normalizeSql(query);
      const fingerprint = fingerprintSql(sql);
      const entry = entries.get(fingerprint) ?? {
        executions: 0,
        parameterSamples: [],
        sql,
        testSources: new Set<string>(),
      };
      entry.executions += 1;
      const source = options.getSource?.();
      if (typeof source === "string") {
        entry.testSources.add(source);
      }
      if (entry.parameterSamples.length < maximumSamples) {
        entry.parameterSamples.push(
          params.map((parameterValue) => summarizeParameter(parameterValue)),
        );
      }
      entries.set(fingerprint, entry);
    },
  };

  return {
    getCorpus: () => ({
      queries: [...entries.entries()]
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([fingerprint, entry]) => ({
          executions: entry.executions,
          fingerprint,
          parameterSamples: entry.parameterSamples,
          sql: entry.sql,
          testSources: [...entry.testSources].toSorted(),
        })),
      version: 1,
    }),
    logger,
  };
}

export {
  createQueryCapture,
  diffQueryCorpus,
  fingerprintSql,
  normalizeSql,
  renderQueryCorpusDiff,
  serializeQueryCorpus,
  writeQueryCorpus,
};
export type {
  QueryCapture,
  QueryCaptureOptions,
  QueryCorpus,
  QueryCorpusDiff,
  QueryCorpusEntry,
};
