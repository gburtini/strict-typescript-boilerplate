import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, expect, it } from "vitest";
import { loadImmutableAssets, readStaticAsset } from "../../server/static-assets";

async function withAssets(operation: (root: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(nodePath.join(tmpdir(), "strict-assets-"));
  const root = nodePath.join(directory, "client");
  try {
    await mkdir(nodePath.join(root, "assets"), { recursive: true });
    await mkdir(nodePath.join(root, "server"));
    await mkdir(nodePath.join(root, ".vite"));
    await writeFile(
      nodePath.join(root, ".vite", "manifest.json"),
      JSON.stringify({
        entry: { file: "assets/app-ABCdef12.js", css: ["assets/app-ABCdef12.css"] },
      }),
    );
    await writeFile(nodePath.join(root, "index.html"), "<h1>Application</h1>");
    await writeFile(
      nodePath.join(root, "assets", "app.js"),
      "export const ready = true;",
    );
    await writeFile(nodePath.join(root, "server", "main.js"), "private server code");
    await writeFile(
      nodePath.join(root, "assets", "app-ABCdef12.js"),
      "compiled script",
    );
    await writeFile(
      nodePath.join(root, "assets", "app-ABCdef12.css"),
      "compiled stylesheet",
    );
    await writeFile(
      nodePath.join(root, "assets", "public-ABCdef12.js"),
      "public script",
    );
    await writeFile(nodePath.join(root, ".env"), "private config");
    await writeFile(nodePath.join(directory, "private.txt"), "private data");
    await symlink(
      nodePath.join(directory, "private.txt"),
      nodePath.join(root, "assets", "link.txt"),
    );
    await operation(root);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("production assets", () => {
  it.each([
    "/../private.txt",
    "/%2e%2e/private.txt",
    "/server/main.js",
    "/.env",
    "/assets/link.txt",
    "/assets/missing.js",
  ])("rejects private or missing asset %s", async (pathname) => {
    expect.hasAssertions();
    await withAssets(async (root) => {
      await expect(readStaticAsset(root, pathname)).resolves.toStrictEqual({
        found: false,
      });
    });
  });

  it("serves the browser entry and assets with declared content types", async () => {
    expect.hasAssertions();
    await withAssets(async (root) => {
      const expected = await readFile(nodePath.join(root, "index.html"));
      await expect(readStaticAsset(root, "/dashboard")).resolves.toMatchObject({
        found: true,
        body: expected,
        contentType: "text/html; charset=utf-8",
      });
      await expect(readStaticAsset(root, "/assets/app.js")).resolves.toMatchObject({
        found: true,
        contentType: "text/javascript; charset=utf-8",
      });
    });
  });

  it.each([
    {
      pathname: "/assets/app-ABCdef12.js",
      cacheControl: "public, max-age=31536000, immutable",
    },
    {
      pathname: "/assets/app-ABCdef12.css",
      cacheControl: "public, max-age=31536000, immutable",
    },
    { pathname: "/dashboard", cacheControl: "no-cache" },
    { pathname: "/assets/app.js", cacheControl: "no-cache" },
    { pathname: "/assets/public-ABCdef12.js", cacheControl: "no-cache" },
  ])("sets $cacheControl for $pathname", async ({ pathname, cacheControl }) => {
    expect.hasAssertions();
    await withAssets(async (root) => {
      const immutable = await loadImmutableAssets(root);
      await expect(readStaticAsset(root, pathname, immutable)).resolves.toMatchObject({
        found: true,
        cacheControl,
      });
    });
  });
});
