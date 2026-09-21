# Jev semantic checks

This prototype uses Jev through Vercel AI Gateway for three judgments that the
repository's deterministic checks do not currently express:

- `duplicatesExistingAbstraction` — the change adds an abstraction with an
  existing responsibility;
- `bypassesRepositoryPrimitive` — the change reimplements behavior already
  provided by a repository primitive in the supplied context;
- `missingBehaviorTest` — observable behavior changes without an appropriate
  behavior test in the supplied context.

Run `pnpm lint:semantic` to evaluate the branch diff against `origin/main`, or
`pnpm lint:semantic:eval` to run the checked-in labeled examples. The AI SDK
uses Vercel AI Gateway and the `typesafe-ai/jev` model. Authentication uses the
Gateway credentials available to the AI SDK, such as `VERCEL_OIDC_TOKEN` or
`AI_GATEWAY_API_KEY`. Neither command is part of `pnpm check:all`; semantic
findings remain observational until the fixture corpus and real-change results
are reviewed.

The review command sends the selected diff, repository policy documents, and
changed source files with adjacent test files to AI Gateway. It does not send
the entire repository. The state is capped at 90,000 characters. Use it only
when sending that branch's source and policy context to the Gateway is
appropriate. Gateway zero-data-retention is requested for each call. The
service receives source code as untrusted evidence; policy questions are
defined in the trusted script, and source comments do not define policy.

The context collector currently includes `AGENTS.md`, `ARCHITECTURE.md`,
`CONVENTIONS.md`, `TESTING.md`, changed code paths, and neighboring test files.
It does not yet perform repository-wide symbol search or import-graph
retrieval. The 24 synthetic fixtures produce 72 Boolean judgments per pass.
Each rule has at least eight positive and eight negative examples; `--eval`
reports the confusion counts, precision, recall, specificity, accuracy, and
each case's probability. Precision is zero if the evaluator predicts no
positive cases. These examples are an initial sanity corpus, not evidence that
a rule is calibrated for blocking use. `finding` uses a 0.97
Jev Boolean probability; 0.70–0.97 is reported as `abstain`; lower values are
reported as `pass`. Every result is marked `observe` and does not fail the
command.

The evaluator records the resolved model ID returned by the Gateway so model
alias changes are visible. The current Gateway model identifier is an alias,
so the resolved ID must be checked alongside probability changes during SDK or
model updates. The exact AI SDK dependency and fresh transitive releases have a
version-specific, temporary release-age exception documented in
`DEPENDENCIES.md` and `EXCEPTIONS.md`.
