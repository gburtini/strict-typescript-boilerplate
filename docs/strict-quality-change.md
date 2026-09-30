# Strict quality integration

Review scope: governance, acceptance, runtime, architecture,
security, compiler applicability, and product/database policies.

## Resulting acceptance

The full local gate now applies migrations to a uniquely named disposable
PostgreSQL service, runs real persistence and browser recovery, captures query
shapes and checks the pinned planner fixture. Standalone integration checks
build current UI code before browser evidence. The static subset retains unit
tests and adds the digest-pinned local security scanner and its fixtures.

CI aggregates local acceptance, Actionlint, Semgrep, CodeQL, dependency audit,
OSV where applicable, and base/proposed query-plan comparison. A skipped or
failed applicable dependency does not constitute acceptance. Remote workflows
and repository rulesets need independent administrator verification.

No lint severity, coverage threshold, planner threshold, or baseline was lowered.
The framework registry stops applying Preact/Next/native rules to React/Vite.
React Compiler is required; upstream rules marked disabled with the compiler
give way to compiler-specific guidance. The transformation check verifies real
memoization output, and compiler errors fail builds. Babel 7 is pinned because
the stable compiler failed on Babel 8 assignment-pattern ASTs.

Exact registered overrides and ignores must match the effective configuration.
Semantic context retrieval includes owning tests, nested policy and bounded
imports; insufficient evidence cannot produce a pass. Model findings remain
advisory. No source was submitted to an external model for this change.

Security boundary changes and previously rejected cases that now pass are
recorded in [the Semgrep change](semgrep-enforcement-change.md). Negative
fixtures remain active. Knip production entry points now include the runtime
server and libraries; no unused-dependency ignore was added.

## Query evidence

The unchanged PostgreSQL 18.3 planner fixture reported four added shapes,
two removed shapes and zero violations. The new idempotent insert uses the
existing unique email constraint and returns only the domain DTO. Its estimated
cost is 0.02. Lookup by email uses the unique email index; lookup and cleanup by
ID use the primary key. Each lookup has estimated cost 8.3 and one row. Removed
shapes were the previous writer example's insert/returning projection. No index,
migration or planner baseline was changed to obtain this result.

## Behavioral and human evidence

Unit, component and HTTP-boundary tests pass. Red-state artifacts demonstrate
normalization, validation, decoding and narrow-layout failures. Evidence records
identify their command and base revision; source changes under review were
present in the working tree. Nine historical records remain attestations,
explicitly requiring owner review rather than claiming executed proof.

Desktop and 320-pixel reduced-motion browser cases prove completion, retries,
pending feedback, keyboard validation, recovery, accessibility and long-content
reflow. Screenshots exposed missing shared-package CSS scanning and are retained
as CI artifacts. Aesthetic and product usefulness approval remains human work.
The PRODUCT/DESIGN starter brief cannot replace per-product interviews and
representative screen approval.
