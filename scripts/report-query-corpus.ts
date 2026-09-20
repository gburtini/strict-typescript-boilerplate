import { readFile } from "node:fs/promises";
import {
  diffQueryCorpus,
  renderQueryCorpusDiff,
  type QueryCorpus,
  type QueryCorpusEntry,
} from "../packages/db/src/devtools/query-plans.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && !Object.is(value, null);
}

function isQueryCorpusEntry(value: unknown): value is QueryCorpusEntry {
  return (
    isRecord(value) &&
    typeof value.executions === "number" &&
    typeof value.fingerprint === "string" &&
    Array.isArray(value.parameterSamples) &&
    typeof value.sql === "string" &&
    Array.isArray(value.testSources)
  );
}

function parseQueryCorpus(value: unknown): QueryCorpus {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.queries) ||
    !value.queries.every((entry) => isQueryCorpusEntry(entry))
  ) {
    throw new TypeError("Query corpus artifact has an invalid shape");
  }

  return {
    queries: value.queries,
    version: 1,
  };
}

async function readQueryCorpus(path: string): Promise<QueryCorpus> {
  const contents = await readFile(path, "utf8");
  return parseQueryCorpus(JSON.parse(contents));
}

const [baselinePath, currentPath] = process.argv.slice(2);
if (typeof baselinePath !== "string" || typeof currentPath !== "string") {
  throw new TypeError(
    "Usage: pnpm db:query-corpus:report <baseline.json> <current.json>",
  );
}

const [baseline, current] = await Promise.all([
  readQueryCorpus(baselinePath),
  readQueryCorpus(currentPath),
]);
process.stdout.write(renderQueryCorpusDiff(diffQueryCorpus(baseline, current)));
