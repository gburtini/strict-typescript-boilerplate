# Dependency Policy

pnpm enforces a seven-day minimum release age for new package versions. The
exception list in `pnpm-workspace.yaml` is for packages that are intentionally
tracked directly from their upstream release process and requires review.

- Review the lockfile and transitive changes with every dependency update.
- Prefer packages with maintained provenance, clear licensing, and a concrete
  need that existing platform or workspace code cannot satisfy.
- Lifecycle scripts are disabled by default; an explicit exception must be
  documented in `SECURITY.md` and this file.
- Vulnerability exceptions require an owner, impact assessment, tracking issue,
  compensating control, and review date.
- Keep dependency updates routine rather than allowing an unreviewed backlog.
- GitHub Actions are pinned to immutable commit SHAs. Update the SHA and its
  version comment together, and review the upstream release before changing it.
