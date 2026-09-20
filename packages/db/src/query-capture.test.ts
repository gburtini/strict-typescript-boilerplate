import { describe, expect, it } from "vitest";
import {
  createQueryCapture,
  diffQueryCorpus,
  fingerprintSql,
  normalizeSql,
  renderQueryCorpusDiff,
  serializeQueryCorpus,
} from "./devtools/query-plans";

describe("query capture", () => {
  it("normalizes only superficial SQL whitespace", () => {
    expect.hasAssertions();
    expect(normalizeSql(" SELECT  *\nFROM users ")).toBe("SELECT * FROM users");
    expect(fingerprintSql("SELECT * FROM users WHERE id = $1")).toBe(
      fingerprintSql("SELECT * FROM users WHERE id = $1"),
    );
    expect(fingerprintSql("SELECT * FROM users WHERE id = $1")).not.toBe(
      fingerprintSql("SELECT * FROM users WHERE email = $1"),
    );
  });

  it("serializes a stable corpus artifact", () => {
    expect.hasAssertions();
    const capture = createQueryCapture();
    capture.logger.logQuery("SELECT 1", []);

    expect(serializeQueryCorpus(capture.getCorpus())).toBe(
      `${JSON.stringify(
        capture.getCorpus(),
        (_key: string, jsonValue: unknown): unknown => jsonValue,
        2,
      )}\n`,
    );
  });

  it("renders added query shapes for a change report", () => {
    expect.hasAssertions();
    const baseline = createQueryCapture();
    baseline.logger.logQuery("SELECT 1", []);
    const current = createQueryCapture();
    current.logger.logQuery("SELECT 1", []);
    current.logger.logQuery("SELECT 2", []);

    const report = renderQueryCorpusDiff(
      diffQueryCorpus(baseline.getCorpus(), current.getCorpus()),
    );

    expect(report).toContain("Added: 1");
    expect(report).toContain("SELECT 2");
  });

  it("deduplicates queries and redacts parameter values", () => {
    expect.hasAssertions();
    const capture = createQueryCapture({
      getSource: () => "users.test.ts:lists users",
    });

    capture.logger.logQuery("SELECT *\nFROM users WHERE email = $1", [
      "person@example.com",
    ]);
    capture.logger.logQuery("SELECT * FROM users WHERE email = $1", [
      "another@example.com",
    ]);

    expect(capture.getCorpus()).toStrictEqual({
      queries: [
        {
          executions: 2,
          fingerprint: fingerprintSql("SELECT * FROM users WHERE email = $1"),
          parameterSamples: [["<string:18>"], ["<string:19>"]],
          sql: "SELECT * FROM users WHERE email = $1",
          testSources: ["users.test.ts:lists users"],
        },
      ],
      version: 1,
    });
  });
});
