import { readFileSync } from "node:fs";
import { z } from "zod";

const coverageBaselineSchema = z.object({
    branches: z.number(),
    functions: z.number(),
    lines: z.number(),
    statements: z.number(),
  }),
  coverageSummarySchema = z.object({
    total: z.object({
      branches: z.object({ pct: z.number() }),
      functions: z.object({ pct: z.number() }),
      lines: z.object({ pct: z.number() }),
      statements: z.object({ pct: z.number() }),
    }),
  }),
  metrics = ["branches", "functions", "lines", "statements"] as const,
  failures: string[] = [],
  baselineValue = coverageBaselineSchema.parse(
    JSON.parse(readFileSync("apps/web/coverage-baseline.json", "utf8")),
  ),
  summaryValue = coverageSummarySchema.parse(
    JSON.parse(readFileSync("apps/web/coverage/coverage-summary.json", "utf8")),
  );
for (const metric of metrics) {
  const baseline = baselineValue[metric],
    actual = summaryValue.total[metric].pct;
  if (actual < baseline) {
    failures.push(`${metric}: ${actual}% is below ${baseline}%`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`Coverage ratchet failed:\n${failures.join("\n")}\n`);
  process.exitCode = 1;
}
