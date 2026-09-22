import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import {
  mapWithConcurrency,
  mergeQueryCorpora,
  parseQueryCorpus,
  serializeQueryCorpus,
  type QueryCorpus,
} from "@template/db/devtools/query-plans";
import { repositoryRoot } from "../shared/repository-paths.ts";

const artifactDirectory = nodePath.resolve(repositoryRoot, ".artifacts");
const outputPath = nodePath.resolve(artifactDirectory, "query-corpus.json");

// The test runner can fork workers. Each worker writes a shard so corpus
// Generation observes the SQL that tests actually exercised.
const artifactEntries = await readdir(artifactDirectory).catch(() => []);
const corpusPaths = artifactEntries
  .filter((file) => /^query-corpus-\d+\.json$/u.test(file))
  .map((file) => nodePath.resolve(artifactDirectory, file));
if (corpusPaths.length === 0) {
  throw new TypeError(
    "No query corpus shards were captured; run the database integration tests with QUERY_PLAN_CAPTURE=1",
  );
}

const corpora: QueryCorpus[] = [];
const corpusDocuments = await mapWithConcurrency(corpusPaths, 4, async (corpusPath) => {
  const corpusDocument = await readFile(corpusPath, "utf8");
  return corpusDocument.trim();
});
for (const corpusDocument of corpusDocuments) {
  const parsedDocument: unknown = JSON.parse(corpusDocument);
  corpora.push(parseQueryCorpus(parsedDocument));
}

const mergedCorpus = mergeQueryCorpora(corpora);
if (mergedCorpus.queries.length === 0) {
  throw new TypeError("The captured query corpus is empty");
}

await mkdir(artifactDirectory, { recursive: true });
await writeFile(outputPath, serializeQueryCorpus(mergedCorpus), "utf8");
