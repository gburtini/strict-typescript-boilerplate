# Jev semantic checks

This prototype uses Jev through Vercel AI Gateway for three maintainability
judgments that the repository's deterministic checks do not currently express:

- `duplicatesExistingAbstraction` — the change adds an abstraction with an
  existing responsibility;
- `bypassesRepositoryPrimitive` — the change reimplements behavior already
  provided by a repository primitive in the supplied context;
- `behaviorInWrongLayer` — the change places parsing, API contract types,
  business decisions, UI state, or database access outside the layer that the
  supplied architecture assigns to that responsibility. The rule requires
  evidence for both the changed layer and the established owner; missing
  ownership evidence is labeled false.

Run `pnpm lint:semantic` to evaluate the branch diff against `origin/main`, or
`pnpm lint:semantic:eval` to run the checked-in labeled examples. The AI SDK
uses Vercel AI Gateway and the `typesafe-ai/jev` model. Authentication uses the
Gateway credentials available to the AI SDK, such as `VERCEL_OIDC_TOKEN` or
`AI_GATEWAY_API_KEY`. Set `AI_GATEWAY_API_KEY` locally to enable live calls.
The versioned policy lives in `quality/semantic/rules.json`; pass
`--config <path>` to any runner mode to use another rule configuration. The
configuration owns the model ID, rule wording and criteria, rule versions,
thresholds, observe mode, context-size limit, and minimum fixture counts.

`pnpm semantic:check` always runs the offline config/corpus validation and
positive/negative policy checks. It is part of `pnpm check:all` and CI checks
that this path remains connected. A separate advisory workflow runs the live
fixture evaluation only after matching changes land on `main`, or through
manual dispatch on `main`.
It provides the Gateway key only to the evaluation process, never to
pull-request code. If the repository secret is not configured, that workflow
reports the missing secret and skips live evaluation. Jev findings remain
observational; evaluation metrics do not block merges.

The review command sends the selected diff, repository policy documents, and
changed source files with adjacent test files to AI Gateway. It does not send
the entire repository. The state is capped at the configured character limit.
The current Gateway Hobby plan rejects the zero-data-retention request option,
so source-diff review does not request ZDR. Run that command only when sending
the selected source and policy context to the Gateway is appropriate. CI live
evaluation sends only the synthetic fixture corpus. Jev receives source code
as untrusted evidence; rule policy is defined in the trusted JSON
configuration, and source comments do not define policy.

The context collector currently includes `AGENTS.md`,
`docs/policies/ARCHITECTURE.md`, `docs/policies/CONVENTIONS.md`,
`docs/policies/TESTING.md`, changed code paths, and neighboring test files.
It does not yet perform repository-wide symbol search or import-graph
retrieval. The 28 synthetic fixtures produce 84 Boolean judgments per pass.
Each rule has at least eight positive and eight negative examples as required
by `rules.json`; `--eval` reports the confusion counts, precision, recall,
specificity, accuracy, and
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
