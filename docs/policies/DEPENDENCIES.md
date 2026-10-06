# Dependency Policy

pnpm enforces a seven-day minimum release age for new package versions. The
exception list in `pnpm-workspace.yaml` is for packages that are intentionally
tracked directly from their upstream release process and requires review.
The exact `@gdp-ts/core@0.1.0` and `@effect/tsgo@0.47.1` entries, including the
matching Effect platform binaries, are one-version exceptions needed for the
requested GDP integration; remove each after its release has aged past seven
days.

`source-map-js@1.2.2` is temporarily excluded from the age gate to remediate
GHSA-68fv-2mgg-jv7q (owner: repository maintainers; tracking: PR #15). It
reaches seven days on 2026-10-07; remove the exact-version exclusion after that.

- Review the lockfile and transitive changes with every dependency update.
- Prefer packages with maintained provenance, clear licensing, and a concrete
  need that existing platform or workspace code cannot satisfy.
- Lifecycle scripts are disabled by default; an explicit exception must be
  documented in [`SECURITY.md`](SECURITY.md) and this file.
- Vulnerability exceptions require an owner, impact assessment, tracking issue,
  compensating control, and review date.
- Keep dependency updates routine rather than allowing an unreviewed backlog.
- GitHub Actions are pinned to immutable commit SHAs. Update the SHA and its
  version comment together, and review the upstream release before changing it.
- The repository's CI-policy check verifies SHA pinning and least-privilege
  workflow permissions. Branch protection requires `Repository acceptance` and
  `Trusted enforcement comparison`, as specified in [`GOVERNANCE.md`](GOVERNANCE.md)
  and `.github/rulesets/default-branch.json`. The acceptance job requires the
  repository, initialized-project, Actionlint, and applicable security and query-plan
  jobs to succeed; workflow names are not the required status-check contexts.

`ai@7.0.105` and its exact AI SDK transitive versions are pinned for the
experimental Jev evaluation API used through Vercel AI Gateway. These releases
have aged past the seven-day minimum, so they do not need an age-gate exception.
Keep the pins only while the integration needs these API versions; Jev remains
advisory and its use of source code requires explicit authorization.

The `prepare` lifecycle script is an explicit toolchain exception. It runs
`effect-tsgo patch --oxlint --typescript` so the installed TypeScript 7 and
Oxlint binaries use the Effect diagnostics integration. The package, command,
owner, and verification are recorded in [`EXCEPTIONS.md`](EXCEPTIONS.md). The
command must be idempotent and must not access application secrets.
