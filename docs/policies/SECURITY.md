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
