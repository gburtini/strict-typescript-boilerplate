import { readFileSync } from "node:fs";

const metrics = ["branches", "functions", "lines", "statements"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

const summaryValue: unknown = readJson("apps/web/coverage/coverage-summary.json");
const baselineValue: unknown = readJson("apps/web/coverage-baseline.json");
if (
  !isRecord(summaryValue) ||
  !isRecord(summaryValue.total) ||
  !isRecord(baselineValue)
) {
  throw new TypeError("coverage summary or baseline is invalid");
}

const failures: string[] = [];
for (const metric of metrics) {
  const baselineValueForMetric = baselineValue[metric];
  if (typeof baselineValueForMetric !== "number")
    throw new TypeError(`baseline.${metric} must be a number`);
  const baseline = baselineValueForMetric;
  const metricSummary = summaryValue.total[metric];
  if (!isRecord(metricSummary))
    throw new TypeError(`summary.total.${metric} is invalid`);
  if (typeof metricSummary.pct !== "number")
    throw new TypeError(`summary.total.${metric}.pct must be a number`);
  const actual = metricSummary.pct;
  if (actual < baseline) failures.push(`${metric}: ${actual}% is below ${baseline}%`);
}

if (failures.length > 0) {
  console.error(`Coverage ratchet failed:\n${failures.join("\n")}`);
  process.exitCode = 1;
}
