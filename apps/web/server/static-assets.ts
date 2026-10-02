import { readFile, realpath } from "node:fs/promises";
import nodePath from "node:path";

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
}

async function readStaticAsset(
  root: string,
  pathname: string,
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
    return {
      found: true,
      body,
      contentType:
        contentTypes.get(nodePath.extname(resolved)) ?? "application/octet-stream",
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { found: false };
    }
    throw error;
  }
}

export { readStaticAsset };
