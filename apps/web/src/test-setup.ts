import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", async (): Promise<Response> => {
    throw new Error("Network access is disabled in unit tests; mock fetch explicitly.");
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
