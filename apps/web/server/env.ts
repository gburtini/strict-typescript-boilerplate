import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import metadata from "../package.json";

const serverEnv = createEnv({
  runtimeEnv: process.env,
  server: {
    REFERENCE_API_ENABLED: z.enum(["true", "false"]).default("false"),
    TELEMETRY_SERVICE_NAME: z.string().min(1).default(metadata.name),
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4173),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z
      .url()
      .default("http://localhost:4318/v1/traces"),
    DATABASE_URL: z
      .url()
      .refine(
        (value) =>
          ["localhost", "127.0.0.1", "[::1]"].includes(
            new globalThis.URL(value).hostname,
          ),
        "The public reference API requires a loopback database",
      )
      .default("postgresql://postgres:postgres@localhost:5432/typescript_boilerplate"),
  },
});

export { serverEnv };
