# Generated Files

Generated output is owned by its generator, schema, or source template. Do not
edit generated output directly.

The machine-readable manifest is `generated-files.json`; CI validates that every
declared source and output exists. This starter currently has no generated
application files. When one is added, record it in that manifest and here:

| Generated path   | Source of truth  | Regeneration command | CI freshness check           |
| ---------------- | ---------------- | -------------------- | ---------------------------- |
| `path/to/output` | `path/to/source` | `pnpm generate:name` | `pnpm generate:name --check` |

Generated files should include a standard “do not edit” header where the file
format permits it. CI must regenerate or check generated output and fail when
the working tree changes.
