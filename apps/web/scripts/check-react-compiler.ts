import { createServer } from "vite";

const server = await createServer({
  configLoader: "runner",
  server: { middlewareMode: true },
});
try {
  const transformedFiles = await Promise.all([
    server.transformRequest("/src/app.tsx"),
    server.transformRequest("/src/components/registration-form.tsx"),
  ]);
  for (const transformed of transformedFiles) {
    if (transformed?.code.includes("react.memo_cache_sentinel") !== true) {
      throw new Error("React Compiler did not compile the application and form");
    }
  }
  process.stdout.write(
    "React Compiler transformed the application and interactive form.\n",
  );
} finally {
  await server.close();
}
