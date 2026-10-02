import type { IncomingMessage, ServerResponse } from "node:http";
import type { ReferenceApi } from "./reference-api";
import { readStaticAsset } from "./static-assets";

interface ResponseOptions {
  readonly api?: ReferenceApi;
  readonly root: string;
  readonly stopping: boolean;
}

async function respond(
  request: IncomingMessage,
  response: ServerResponse,
  options: ResponseOptions,
): Promise<void> {
  const { pathname } = new globalThis.URL(request.url ?? "/", "http://localhost");
  const { api, root, stopping } = options;
  response.setHeader("X-Content-Type-Options", "nosniff");
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
  const asset = await readStaticAsset(root, pathname);
  if (!asset.found) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": asset.contentType,
    "Content-Length": asset.body.length,
  });
  if (request.method === "HEAD") {
    response.end();
  } else {
    response.end(asset.body);
  }
}

export { respond };
