import { readFile } from "node:fs/promises";
import {
  diffQueryCorpus,
  queryCorpusSchema,
  renderQueryCorpusDiff,
  type QueryCorpus,
} from "@template/db/devtools/query-plans";

async function readQueryCorpus(path: string): Promise<QueryCorpus> {
  const contents = await readFile(path, "utf8");
  return queryCorpusSchema.parse(JSON.parse(contents));
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
