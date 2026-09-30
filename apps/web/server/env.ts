import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const serverEnv = createEnv({
  runtimeEnv: process.env,
  server: {
    REFERENCE_API_ENABLED: z.enum(["true", "false"]).default("false"),
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
