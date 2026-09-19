import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.stubGlobal("fetch", async (): Promise<Response> => {
    throw new Error("Network access is disabled in unit tests; mock fetch explicitly.");
  });
});
