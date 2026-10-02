import { readFile, realpath } from "node:fs/promises";
import nodePath from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";

const assetManifestSchema = z.record(
  z.string(),
  z.object({
    file: z.string(),
    css: z.array(z.string()).optional(),
    assets: z.array(z.string()).optional(),
  }),
);

async function loadImmutableAssets(root: string): Promise<ReadonlySet<string>> {
  const manifest = assetManifestSchema.parse(
    JSON.parse(await readFile(nodePath.join(root, ".vite", "manifest.json"), "utf8")),
  );
  const files = Object.values(manifest).flatMap((entry) => [
    entry.file,
    ...(entry.css ?? []),
    ...(entry.assets ?? []),
  ]);
  return new Set(
    files.filter((file) => /^assets\/[^/]+-[\w-]{8,}\.[\w.]+$/u.test(file)),
  );
}

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"],
  [".woff2", "font/woff2"],
]);

interface StaticAsset {
  readonly body: Buffer;
  readonly contentType: string;
  readonly cacheControl: string;
  readonly etag: string;
}

async function readStaticAsset(
  root: string,
  pathname: string,
  immutableAssets: ReadonlySet<string> = new Set(),
): Promise<{ readonly found: false } | (StaticAsset & { readonly found: true })> {
  const canonicalRoot = await realpath(root);
  const decoded = decodeURIComponent(pathname);
  if (
    decoded.split("/").some((segment) => segment.startsWith(".")) ||
    decoded === "/server" ||
    decoded.startsWith("/server/")
  ) {
    return { found: false };
  }
  const file = nodePath.resolve(canonicalRoot, `.${decoded}`);
  if (!file.startsWith(`${canonicalRoot}${nodePath.sep}`) && file !== canonicalRoot) {
    return { found: false };
  }
  let candidate = file;
  if (pathname === "/" || nodePath.extname(file).length === 0) {
    candidate = nodePath.join(canonicalRoot, "index.html");
  }
  try {
    const resolved = await realpath(candidate);
    if (!resolved.startsWith(`${canonicalRoot}${nodePath.sep}`)) {
      return { found: false };
    }
    const body = await readFile(resolved);
    let cacheControl = "no-cache";
    if (immutableAssets.has(nodePath.relative(canonicalRoot, resolved))) {
      cacheControl = "public, max-age=31536000, immutable";
    }
    return {
      found: true,
      body,
      contentType:
        contentTypes.get(nodePath.extname(resolved)) ?? "application/octet-stream",
      cacheControl,
      etag: `"${createHash("sha256").update(body).digest("hex")}"`,
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { found: false };
    }
    throw error;
  }
}

export { loadImmutableAssets, readStaticAsset };
