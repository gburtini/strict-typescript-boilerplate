# Enforcement review: initialization and caching

## Initialization

Replacement now happens in one pass. A configured scope containing a template
name remains exactly as supplied. The [collision fixture failed on the previous
implementation](evidence/initialization-collision-red.txt), then passed after
the fix.

The new CI job verifies a fresh disposable copy, with frozen installs and the
full acceptance gate. The template additionally exercises initialization before
the second install. An initialized project verifies its existing identity.
Its fixture script retains template sentinel values, using the same ownership
boundary as existing initialization fixtures. No application source is excluded.

`Repository acceptance` now requires this job. CI policy and governance fixtures
reject a missing dependency, a conditional job or step, and a replaced command.
The [CI command mutation failed](evidence/initialized-ci-red.txt).
The [full smoke test failed when canonical lockfile regeneration was removed](evidence/initialized-project-red.txt).
All temporary mutations were restored.

### Cold-cache CI repair

[Hosted run 37040695090](https://github.com/gburtini/strict-typescript-boilerplate/actions/runs/37040695090)
failed because a frozen install did not populate the registry metadata needed
by offline lockfile regeneration. An isolated empty-cache smoke fixture
[reproduced the same failure locally](evidence/initialization-cold-cache-red.txt).
The smoke command now always allocates independent package and metadata caches,
removing both on exit. Previously a developer's warm cache could hide this failure.
Cache paths are supplied through pnpm command-line configuration. This avoids checking
then rewriting `.npmrc`, which CodeQL identified as a filesystem race in
[run 37044276674](https://github.com/gburtini/strict-typescript-boilerplate/actions/runs/37044276674).

Initialization now allows pnpm to fetch missing metadata with `--prefer-offline`.
It rejects changes to external importer bindings, package resolutions and
transitive snapshots before continuing, restoring sources and the lockfile on
failure. Workspace aliases may change with the configured scope; external
dependency pins must remain unchanged. The resolution fixture accepts scope
renaming and key reordering, and rejects integrity, transitive and direct-version
changes. [Removing the guard fails the fixture](evidence/initialization-resolutions-red.txt).

The artifact uploader now includes hidden files for three explicit evidence
paths: the smoke log, project configuration and acceptance artifacts. It excludes
the checkout and dependency caches. The previous default skipped the entire
hidden `.artifacts` directory. CI policy additionally rejects hidden-file opt-out,
widened paths and ignored missing files. [Removing the hidden-file requirement
fails the fixture](evidence/initialization-upload-red.txt).

Cold-cache initialization with missing registry metadata now succeeds. No existing
validation was removed, no dependency or baseline changed, and no lint threshold
was altered. Artifact inclusion widened only to the named evidence paths; all
existing acceptance gates remain required. Temporary mutations were restored.

## Delivery and documentation

The Vite client build now generates its asset manifest. The Node composition
loads and validates it at startup. Immutable caching is limited to manifested
content hashes; other assets revalidate with ETags. API, readiness and errors
remain uncached. Unit and real-server [regression evidence](evidence/server-cache-red.md)
is recorded alongside the original boundary evidence.

The dependency policy now names the same required status contexts as governance
and the reusable ruleset. No hosted settings, dependencies, query baselines,
lint thresholds or existing checks changed. The added CI job has read-only
repository permissions and uses the existing pinned actions. No previously
rejected unsafe operation gained acceptance.
