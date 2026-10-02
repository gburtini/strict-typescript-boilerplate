# Static asset regression evidence

The [original path-boundary regression](static-assets-red.txt) protects private
files, symlink escapes and missing assets.

The [cache regression](asset-cache-red.txt) adds a real manifest and hashed
script/stylesheet fixtures. It fails when manifested hashes receive `no-cache`
instead of immutable caching. Public files, including hash-looking names absent
from the manifest, must continue to revalidate.

Revision: `c431df5`, with the new fixtures and manifest loader added in the
working checkout. Command: `pnpm --filter @template/web exec vitest run src/tests/static-assets.test.ts`.
The temporary cache-policy mutation was restored.
