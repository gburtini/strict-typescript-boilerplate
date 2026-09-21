import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

const evidenceRecordSchema = z.object({
    change: z.string(),
    redState: z.string(),
    redStateConfirmed: z.literal(true),
    test: z.string(),
  }),
  evidenceSchema = z.object({
    records: z.array(evidenceRecordSchema),
  }),
  evidence = evidenceSchema.parse(
    JSON.parse(readFileSync("docs/test-evidence.json", "utf8")),
  );

for (const record of evidence.records) {
  if (!existsSync(record.test)) {
    throw new TypeError(
      "every test evidence record requires a real test and confirmed red-state evidence",
    );
  }
}
