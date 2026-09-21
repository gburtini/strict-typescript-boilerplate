# Generated Files

Generated output is owned by its generator, schema, or source template. Do not
edit generated output directly.

The machine-readable manifest is `generated-files.json`; CI validates that every
declared source and output exists and runs its freshness command. The Drizzle
migrations are the first generated artifact:

| Generated path         | Source of truth             | Regeneration command | CI freshness check         |
| ---------------------- | --------------------------- | -------------------- | -------------------------- |
| `packages/db/drizzle/` | `packages/db/src/schema.ts` | `pnpm db:generate`   | `pnpm db:migrations:check` |

When another generated artifact is added, record it in that manifest and here.

Generated files should include a standard “do not edit” header where the file
format permits it. CI must regenerate or check generated output and fail when
the working tree changes.
