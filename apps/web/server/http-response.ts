import type { IncomingMessage, ServerResponse } from "node:http";
import type { ReferenceApi } from "./reference-api";
import { readStaticAsset } from "./static-assets";

interface ResponseOptions {
  readonly api?: ReferenceApi;
  readonly root: string;
  readonly stopping: boolean;
  readonly immutableAssets: ReadonlySet<string>;
}

function matchesEtag(validator: string | undefined, etag: string): boolean {
  return (
    validator?.split(",").some((value) => {
      const tag = value.trim().replace(/^W\//u, "");
      return tag === "*" || tag === etag;
    }) === true
  );
}

async function respond(
  request: IncomingMessage,
  response: ServerResponse,
  options: ResponseOptions,
): Promise<void> {
  const { pathname } = new globalThis.URL(request.url ?? "/", "http://localhost");
  const { api, root, stopping } = options;
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
  if (pathname === "/readyz") {
    if (api) {
      await api.ready();
    }
    if (stopping) {
      response.writeHead(503);
      response.end("stopping");
    } else {
      response.writeHead(200);
      response.end("ready");
    }
    return;
  }
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    if (api) {
      const result = await api.handler.handle(
        Object.assign(request, { originalUrl: request.url ?? "/" }),
        response,
        { prefix: "/api" },
      );
      if (result.matched) {
        return;
      }
    }
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  const asset = await readStaticAsset(root, pathname, options.immutableAssets);
  if (!asset.found) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const headers = {
    "Content-Type": asset.contentType,
    "Cache-Control": asset.cacheControl,
    ETag: asset.etag,
  };
  if (matchesEtag(request.headers["if-none-match"], asset.etag)) {
    response.writeHead(304, headers);
    response.end();
    return;
  }
  response.writeHead(200, {
    ...headers,
    "Content-Length": asset.body.length,
  });
  if (request.method === "HEAD") {
    response.end();
  } else {
    response.end(asset.body);
  }
}

export { respond };
