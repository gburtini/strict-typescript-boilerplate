import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../../devtools/map-with-concurrency.js";

describe("the concurrency mapper", () => {
  it("limits active work and preserves input order", async () => {
    expect.hasAssertions();

    let activeCount = 0;
    let maximumActiveCount = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
      activeCount += 1;
      maximumActiveCount = Math.max(maximumActiveCount, activeCount);
      await Promise.resolve();
      activeCount -= 1;
      return value * 10;
    });

    expect(maximumActiveCount).toBe(2);
    expect(results).toStrictEqual([10, 20, 30, 40]);
  });
});
