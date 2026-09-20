import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { writeFile as writeFileAsync } from "node:fs/promises";
import type { Logger } from "drizzle-orm";
import nodePath from "node:path";
import { z } from "zod";

// Tests generate the query corpus automatically. Keeping capture here means
// Agents cannot silently omit a newly exercised query from plan analysis.

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

interface QueryCorpusAccumulator {
  executions: number;
  parameterSamples: unknown[][];
  sql: string;
  testSources: Set<string>;
}

let processCapture: QueryCapture | null = null;

const parameterSamplesSchema = z.array(z.unknown());
const queryCorpusEntrySchema = z.object({
  executions: z.number().int().nonnegative(),
  fingerprint: z.string(),
  parameterSamples: z.array(parameterSamplesSchema),
  sql: z.string(),
  testSources: z.array(z.string()),
});
const queryCorpusSchema = z.object({
  queries: z.array(queryCorpusEntrySchema),
  version: z.literal(1),
});

function jsonIdentity(_key: string, jsonValue: unknown): unknown {
  return jsonValue;
}

function serializeQueryCorpus(corpus: QueryCorpus): string {
  return `${JSON.stringify(corpus, jsonIdentity, 2)}\n`;
}

async function writeQueryCorpus(path: string, corpus: QueryCorpus): Promise<void> {
  await writeFileAsync(path, serializeQueryCorpus(corpus), "utf8");
}

function normalizeSql(sql: string): string {
  return sql.replaceAll(/\s+/gu, " ").trim();
}

function parseQueryCorpus(document: unknown): QueryCorpus {
  try {
    return queryCorpusSchema.parse(document);
  } catch (error) {
    throw new TypeError("Query corpus has an invalid shape", { cause: error });
  }
}

function mergeQueryCorpora(corpora: readonly QueryCorpus[]): QueryCorpus {
  const entries = new Map<string, QueryCorpusAccumulator>();
  for (const corpus of corpora) {
    for (const query of corpus.queries) {
      const entry = entries.get(query.fingerprint) ?? {
        executions: 0,
        parameterSamples: [],
        sql: query.sql,
        testSources: new Set<string>(),
      };
      entry.executions += query.executions;
      entry.parameterSamples.push(
        ...query.parameterSamples.map((sample) => [...sample]),
      );
      entry.parameterSamples = entry.parameterSamples.slice(0, maximumParameterSamples);
      for (const source of query.testSources) {
        entry.testSources.add(source);
      }
      entries.set(query.fingerprint, entry);
    }
  }
  return {
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
  };
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

function getProcessQueryCapture(): QueryCapture {
  if (processCapture !== null) {
    return processCapture;
  }

  const outputDirectory = process.env.QUERY_PLAN_CORPUS_DIR ?? ".artifacts";
  const outputPath = nodePath.join(outputDirectory, `query-corpus-${process.pid}.json`);
  mkdirSync(outputDirectory, { recursive: true });
  processCapture = createQueryCapture();
  process.once("exit", () => {
    if (processCapture !== null) {
      writeFileSync(
        outputPath,
        serializeQueryCorpus(processCapture.getCorpus()),
        "utf8",
      );
    }
  });
  return processCapture;
}

export {
  createQueryCapture,
  diffQueryCorpus,
  fingerprintSql,
  getProcessQueryCapture,
  mergeQueryCorpora,
  normalizeSql,
  parseQueryCorpus,
  renderQueryCorpusDiff,
  serializeQueryCorpus,
  writeQueryCorpus,
  queryCorpusSchema,
};
export type {
  QueryCapture,
  QueryCaptureOptions,
  QueryCorpus,
  QueryCorpusDiff,
  QueryCorpusEntry,
};
