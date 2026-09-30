# Initial Semgrep boundary enforcement

Owner: repository-maintainers. Tracking: this change and `docs/policies/SECURITY.md`.

The previous eight-rule configuration had no rule fixtures, permission registry,
local acceptance command, or explicit suppression protection. The throw rule
excluded arbitrary expressions, the wrapper rule accepted an unrelated cause,
and shell execution matched bare unrelated `exec` functions.

The resulting contract repairs these rules, tests imported subprocess aliases,
recognizes optional catch bindings and qualified fetch calls, and adds string
timers, shell options, TLS verification, and environment access checks. Literal
throws now fail; arbitrary variables remain governed by type-aware lint. No
rules or negative evidence were removed. The Promise-map rule's message now
describes its actual syntax restriction rather than claiming a size analysis.

Previously rejected cases that now pass are raw fetch in the exact browser
registration adapter and unrelated application functions named `exec`. Replacement
evidence includes the adapter's response schema, import-aware positive and
negative fixtures, and cause-preservation fixtures. No other fetch path gains
permission. Environment access is newly restricted to enumerated existing
runtime/tooling entry points; it was unrestricted by Semgrep previously.

All boundary permissions are machine-checked against a registry. Fixture scans
assert exact finding counts, all fixture paths, permission removal, and continued
universal bans inside approved files. Negative source snippets remain inert JSON
until copied into a temporary project; no production ignore was added. The
existing Semgrep engine version and image digest are preserved. Local and CI
commands share the same runner, and `pnpm check` now includes it.

Trusted enforcement comparison includes `.semgrep.yml` and
`.semgrepignore`. The latter restores tests skipped by upstream defaults; the
scan inventory must include every Git-visible JavaScript/TypeScript source file.
These files provide review evidence; they do not constitute independent owner
approval or configure server-side branch protection.
