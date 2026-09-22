import { describe, expect, it } from "vitest";
import {
  createQueryCapture,
  diffQueryCorpus,
  fingerprintSql,
  mergeQueryCorpora,
  normalizeSql,
  parseQueryCorpus,
  renderQueryCorpusDiff,
  serializeQueryCorpus,
} from "../devtools/query-plans";

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

  it("merges process corpus shards without retaining sensitive values", () => {
    expect.hasAssertions();
    const first = createQueryCapture({
      getSource: () => "first.test.ts",
    });
    first.logger.logQuery("SELECT 1", ["secret"]);
    const second = createQueryCapture({
      getSource: () => "second.test.ts",
    });
    second.logger.logQuery("SELECT 1", ["another-secret"]);

    const merged = mergeQueryCorpora(
      [first.getCorpus(), second.getCorpus()].map((corpus) => parseQueryCorpus(corpus)),
    );

    expect(merged.queries[0]).toMatchObject({
      executions: 2,
      parameterSamples: [["<string:6>"], ["<string:14>"]],
      testSources: ["first.test.ts", "second.test.ts"],
    });
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
