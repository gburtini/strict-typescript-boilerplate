# Enforcement ownership

Implementations cannot approve changes to their own acceptance criteria.
Policies, lint configuration, check scripts, negative fixtures, coverage and
query baselines, project profiles, generated metadata, and workflows are
protected contracts. A policy check passing in the proposed checkout is not
independent approval of a change to that check.

## Required repository settings

Configure a ruleset for the default branch requiring pull requests, independent
review, dismissal of stale approvals, approval of the latest push, and the
`Repository acceptance` and `Trusted enforcement comparison` status checks.
Disallow force pushes, branch deletion, and agent bypass of the ruleset. Grant
agents branch write access without administration or approval authority.
These server settings require repository administration; files alone do not
activate them. Record verification evidence and date when configured. The
template assigns responsibility to roles and does not prescribe individuals or
a CODEOWNERS file.

`Enforcement Review` runs from the trusted base through `pull_request_target`.
It fetches the proposed revision as Git data and produces a contract diff. It
never checks out, installs, imports, or executes proposed code and has no
secrets or write token. Do not add proposed scripts to this workflow.

## Enforcement change evidence

For every changed contract, describe its previous and resulting behavior,
removed checks, widened scopes, changed thresholds, deleted negative fixtures,
and changed baselines. Include previously rejected cases that now pass and the
replacement safety evidence. Owners review the trusted comparison independently
of the agent's explanation. If no case changes acceptance, say so explicitly.
Baselines are reviewed evidence, not an agent-controlled fix for a failure.

## Acceptance

`pnpm check:all` proves the local profile's static, unit, build, browser, real
database, and planner obligations. CI's `Repository acceptance` additionally
requires security scanning and the base/proposed query comparison. Provider
outages and missing tools are failed or unavailable evidence, never green
verification. Semantic model findings remain advisory and require independent
review. Source submission to an external model requires explicit authorization;
CI sends synthetic fixtures only, after reviewed changes reach main.
