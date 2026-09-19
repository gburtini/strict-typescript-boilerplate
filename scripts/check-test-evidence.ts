import { existsSync, readFileSync } from "node:fs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const value: unknown = JSON.parse(readFileSync("docs/test-evidence.json", "utf8"));
if (!isRecord(value) || !Array.isArray(value.records))
  throw new TypeError("test evidence manifest is invalid");

for (const record of value.records) {
  if (
    !isRecord(record) ||
    typeof record.change !== "string" ||
    typeof record.test !== "string" ||
    typeof record.redState !== "string" ||
    record.redStateConfirmed !== true ||
    !existsSync(record.test)
  ) {
    throw new TypeError(
      "every test evidence record requires a real test and confirmed red-state evidence",
    );
  }
}
