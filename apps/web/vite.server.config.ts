import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: "server/node/main.ts",
    outDir: "dist/server",
    emptyOutDir: false,
    rolldownOptions: { output: { entryFileNames: "main.mjs" } },
  },
  // Bundle runtime dependencies so the dist directory is independently runnable.
  ssr: { noExternal: true },
});
