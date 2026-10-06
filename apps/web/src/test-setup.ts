import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.stubGlobal("fetch", async (): Promise<Response> => {
    throw new Error("Network access is disabled in unit tests; mock fetch explicitly.");
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
