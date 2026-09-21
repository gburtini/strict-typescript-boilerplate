import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import {
  mergeQueryCorpora,
  parseQueryCorpus,
  serializeQueryCorpus,
  type QueryCorpus,
} from "../src/devtools/query-plans.js";
import { mapWithConcurrency } from "./map-with-concurrency.js";

const repositoryRoot = nodePath.resolve(import.meta.dirname, "../../..");
const artifactDirectory = nodePath.resolve(repositoryRoot, ".artifacts");
const bootstrapPath = nodePath.resolve(repositoryRoot, "query-plans/corpus.json");
const outputPath = nodePath.resolve(artifactDirectory, "query-corpus.json");

// The test runner can fork workers. Each worker writes a shard so corpus
// Generation observes the SQL that tests actually exercised, not a hand-made
// List that an agent could forget to update.
const artifactEntries = await readdir(artifactDirectory).catch(() => []);
const artifactFiles = artifactEntries
  .filter((file) => /^query-corpus-\d+\.json$/u.test(file))
  .map((file) => nodePath.resolve(artifactDirectory, file));
let corpusPaths = artifactFiles;
if (corpusPaths.length === 0) {
  corpusPaths = [bootstrapPath];
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

await mkdir(artifactDirectory, { recursive: true });
await writeFile(outputPath, serializeQueryCorpus(mergeQueryCorpora(corpora)), "utf8");
