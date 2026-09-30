# Security

Security-sensitive behavior is explicit and centralized.

## Trust boundaries

Treat user input, URLs, request data, headers, external responses, webhooks,
environment configuration, persisted data, and client-controlled state as
untrusted until runtime validation succeeds.

Validate once at the boundary and pass trusted representations inward. Do not
use static TypeScript types as runtime validation.

## Authorization and secrets

Authentication establishes identity; authorization determines permission.
Protected actions require server-side authorization checks. UI visibility and
client state are not authorization.

Secrets must not enter client bundles, logs, errors, analytics, or source
control. Read them through centralized validated configuration rather than
arbitrary application modules.

For multi-tenant applications, every data read and write must be scoped to the
authorized tenant in the server-side query or service boundary. Never accept a
tenant identifier from the client as proof of access. Session cookies should be
Secure, HttpOnly, and appropriately SameSite-scoped; state-changing browser
requests require the repository's approved CSRF protection.

Classify sensitive data before storing, logging, exporting, or sending it to a
third party. Redact secrets and personal data at logging boundaries, not after
they have already entered a shared log sink.

## Dangerous sinks

Do not render untrusted HTML without approved sanitization. Do not build SQL,
shell commands, URLs, or filesystem paths through unsafe string concatenation.
Do not use dynamic code execution. Oxlint, Rika Labs rules, Semgrep, and CodeQL
enforce the mechanically detectable cases.

Outbound URL fetches must use an allowlist or equivalent SSRF protection and
must not reach private network destinations. Uploads require size, type,
content, and storage-key validation; never trust a client-provided filename or
MIME type. Webhooks require authenticated signature verification, replay
protection where applicable, and idempotent handling. Public or expensive
endpoints require rate limiting appropriate to their abuse cost.

## Logging and dependencies

Never log credentials, tokens, session secrets, sensitive request bodies, or
unnecessary personal information. Use structured logging with enough context to
diagnose failures safely.

Every dependency needs a concrete purpose and acceptable maintenance/security
posture. Dependency review, OSV scanning, Sherif, and the lockfile are part of
the review surface. Do not weaken security configuration for local convenience.
Dependency lifecycle scripts are disabled or explicitly reviewed; exceptions
must name the package, script, reason, owner, and expiry in the dependency
policy. Vulnerability exceptions require a documented impact assessment,
tracking issue, owner, and review date.

The root `prepare` exception for `@effect/tsgo` only patches local compiler and
Oxlint integrations. It has no network or credential access, is verified for
idempotence by `pnpm toolchain:check`, and is reviewed whenever the toolchain
versions change.

## Incident response

Suspected credential exposure, unauthorized access, data loss, or exploitable
dependency findings must be reported through the project's incident channel
immediately. Preserve relevant logs and timestamps, avoid destructive cleanup,
and do not publish exploit details before the incident owner coordinates a
response.

## Cryptography

Do not invent protocols or primitives. Use established platform or library APIs
and preserve secure defaults.

## Semgrep contract

`pnpm semgrep:check` runs the digest-pinned Semgrep Community Edition container
locally and in CI. Docker must be available. The scanner has no network access,
the source mount is read-only, metrics are disabled, and inline `nosemgrep`
suppression is disabled. Strict scan errors and findings fail acceptance.
Git-visible JavaScript and
TypeScript source paths must all appear in the scan inventory, including tests;
`.semgrepignore` restores source tests omitted by the upstream defaults.

`.semgrep.yml` distinguishes universal bans from boundary rules. Boundary rules
declare `metadata.enforcement: boundary` and exclude exact root-anchored files;
every exclusion must match `devtools/quality/semgrep/permissions.json` exactly.
Directory permissions, glob permissions, duplicate records, missing files, and
expired permissions are rejected. Permission for one operation never exempts
the file from other rules. The registry records ownership, rationale, tracking,
and evidence. Runtime environment modules, Playwright configuration, and the
named database planner/capture entry points currently own environment reads;
the browser registration adapter owns raw HTTP requests. These permissions do
not prove configuration validation, authorization, or destination safety.

Fixtures are stored as inert JSON source snippets in
`devtools/quality/semgrep/fixtures.json`, then materialized in an isolated
temporary project. No production source is excluded to accommodate negative
fixtures. Every rule must have rejecting and accepting examples; finding
multiplicities and fixture scan coverage are checked. Removing boundary
permissions in the temporary configuration must expose the protected operation
at every approved path. A suppression fixture proves inline suppression cannot
hide a finding. Files with boundary permissions also contain a universal-ban
fixture to prove the permissions remain rule-specific.

The initial rules detect dynamic code construction, credential assignments,
shell execution, empty catches, literal throws, lost causes in direct error
wrapping, raw HTTP, direct Promise collection over map, string timers, shell
options, disabled TLS verification, and environment access. Imported subprocess
APIs are matched through their import declarations, with alias and unrelated-name
fixtures. The collection rule enforces canonical syntax; it does not infer
runtime collection size or recognize a limiter hidden in the callback.

These are syntactic contracts, not a proof of all data flows. The wrapper rule
requires a cause drawn from an enclosing catch, supports
typed and nested catches, and rejects unrelated values. It does not establish
that the selected enclosing failure is the correct business-level cause.
Indirectly built subprocess options, arbitrary global aliases, transformed
error causes, and
cross-file validation require further evidence. Type-aware lint remains the
owner of arbitrary thrown values and type escapes; dependency-cruiser remains
the owner of import direction. New taint rules must identify concrete sources,
sinks, and operation-specific sanitizers rather than treating every Zod parse
as sanitization.
