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

## Dangerous sinks

Do not render untrusted HTML without approved sanitization. Do not build SQL,
shell commands, URLs, or filesystem paths through unsafe string concatenation.
Do not use dynamic code execution. Oxlint, Rika Labs rules, Semgrep, and CodeQL
enforce the mechanically detectable cases.

## Logging and dependencies

Never log credentials, tokens, session secrets, sensitive request bodies, or
unnecessary personal information. Use structured logging with enough context to
diagnose failures safely.

Every dependency needs a concrete purpose and acceptable maintenance/security
posture. Dependency review, OSV scanning, Sherif, and the lockfile are part of
the review surface. Do not weaken security configuration for local convenience.

## Cryptography

Do not invent protocols or primitives. Use established platform or library APIs
and preserve secure defaults.
