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
