/**
 * Explicitly opt-in tooling for collecting query shapes for plan analysis.
 * This module is intentionally separate from the production database client.
 */
export {
  createQueryCapture,
  diffQueryCorpus,
  fingerprintSql,
  getProcessQueryCapture,
  mergeQueryCorpora,
  normalizeSql,
  parseQueryCorpus,
  queryCorpusSchema,
  renderQueryCorpusDiff,
  serializeQueryCorpus,
  writeQueryCorpus,
} from "../query-capture.ts";
export type {
  QueryCapture,
  QueryCaptureOptions,
  QueryCorpus,
  QueryCorpusDiff,
  QueryCorpusEntry,
} from "../query-capture.ts";
export { mapWithConcurrency } from "./map-with-concurrency.ts";
export { productionStatsSchema } from "./query-plan-stats.ts";
export type { ProductionStats } from "./query-plan-stats.ts";
