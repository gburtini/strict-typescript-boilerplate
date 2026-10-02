# Built server regression evidence

The [original server exclusion regression](server-assets-red.txt) protects the
private server bundle from browser access.

The [cache transport regression](server-cache-red.txt) runs the real built Node
server. Missing HTML revalidation headers and immutable asset headers fail on
both browser profiles. The tests also exercise weak, list and wildcard ETag
validators, GET/HEAD 304 responses, stale validators and uncached readiness.

Revision: `c431df5`, with the cache regression tests added in the working
checkout. Command: `pnpm test:integration`. The same command passes after the
transport implementation is complete.
