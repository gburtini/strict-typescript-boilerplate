import { z } from "zod";

const disposableDatabaseSchema = z
  .object({
    url: z.url(),
    expectedDatabase: z.string().regex(/^planner_[a-z0-9_]+$/u),
  })
  .transform((configuration, context) => {
    const target = new globalThis.URL(configuration.url);
    const databaseName = target.pathname.slice(1);
    if (
      !["postgres:", "postgresql:"].includes(target.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
      target.search.length > 0 ||
      target.hash.length > 0 ||
      databaseName !== configuration.expectedDatabase
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Planner writes require a loopback planner_* database matching QUERY_PLAN_DISPOSABLE_DATABASE, without URL overrides",
      });
      return z.NEVER;
    }
    target.pathname = "/postgres";
    return { databaseName, url: configuration.url, administrativeUrl: target.href };
  });

export { disposableDatabaseSchema };
