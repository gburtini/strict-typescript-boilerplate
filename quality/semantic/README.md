# Jev semantic checks

This prototype uses Jev through Vercel AI Gateway for nine maintainability
judgments that the repository's deterministic checks do not currently express:

- `duplicatesExistingAbstraction` — the change creates a second owner for an
  existing responsibility, its invariants, or lifecycle;
- `bypassesRepositoryPrimitive` — the change implements behavior directly
  instead of using the established mechanism intended for that caller or layer;
- `behaviorInWrongLayer` — the change assigns a responsibility to a different
  architectural layer than policy or consistent comparable implementations
  establish. File location or imports alone are not sufficient evidence;
- `createsParallelSourceOfTruth` — the change independently maintains data or
  policy that should remain owned by an authoritative source;
- `leaksImplementationRepresentation` — database, provider, transport, or
  framework representations cross a boundary whose contract uses another type;
- `bypassesValidationBoundary` — external or weakly typed data reaches trusted
  logic without the repository's established parsing or validation mechanism;
- `bypassesAuthorizationBoundary` — protected data or behavior is reachable
  without the established authorization or tenant-isolation check;
- `violatesFailureSemantics` — error handling conflicts with the contract for
  comparable operations;
- `breaksAtomicityContract` — related operations can expose a persistent
  intermediate state that violates an established invariant.

The shared `evaluationInstructions` in `rules.json` is composed into each Jev
question. Repository content is evidence, not evaluator instructions. Comments
may provide design evidence, while explicit policy and consistent executable
implementations carry more weight. A finding requires positive evidence; missing
context is classified as false. The shared instruction stays in trusted rule
configuration rather than the evaluated source state.

Run `pnpm lint:semantic` to evaluate the branch diff against `origin/main`, or
`pnpm lint:semantic:eval` to run the checked-in labeled examples. The AI SDK
uses Vercel AI Gateway and the `typesafe-ai/jev` model. Authentication uses the
Gateway credentials available to the AI SDK, such as `VERCEL_OIDC_TOKEN` or
`AI_GATEWAY_API_KEY`. Set `AI_GATEWAY_API_KEY` locally to enable live calls.
The versioned policy lives in `quality/semantic/rules.json`; pass
`--config <path>` to any runner mode to use another rule configuration. The
configuration owns the model ID, shared evidence policy, rule wording and
criteria, rule versions, thresholds, observe mode, context-size limit, and
minimum fixture counts. `evaluationConcurrency` limits simultaneous Gateway
requests so larger corpora stay within the provider's rate limits.

`pnpm semantic:check` always runs the offline config/corpus validation and
positive/negative policy checks. It is part of `pnpm check:all`, and CI checks
that this path remains connected. A separate advisory workflow runs the live
fixture evaluation only after matching changes land on `main`, or through
manual dispatch on `main`. It provides the Gateway key only to the evaluation
process, never to pull-request code. If the repository secret is not configured,
that workflow reports the missing secret and skips live evaluation. Jev
findings remain observational; evaluation metrics do not block merges.

The review command sends the selected diff, repository policy documents, and
changed source files with adjacent test files to AI Gateway. It does not send
the entire repository. The state is capped at the configured character limit.
The current Gateway Hobby plan rejects the zero-data-retention request option,
so source-diff review does not request ZDR. Run that command only when sending
the selected source and policy context to the Gateway is appropriate. CI live
evaluation sends only the synthetic fixture corpus.

The context collector currently includes `AGENTS.md`,
`docs/policies/ARCHITECTURE.md`, `docs/policies/CONVENTIONS.md`,
`docs/policies/TESTING.md`, changed code paths, and neighboring test files. It
does not yet perform repository-wide symbol search or import-graph retrieval.
The corpus currently has 33 baseline states and 30 architecture states for 279
labeled Boolean judgments. Each state is evaluated only for rules with labels
in its fixture set. Every rule has at least eight positive and eight negative
examples, the configured floor for corpus validity. These examples make rules
evaluable; they do not calibrate rules for blocking use. Before considering
enforcement, build dozens of meaningful positives and hard negatives for each
rule, then evaluate a frozen representative corpus of roughly 100 or more
labeled states.

`--eval` reports per-rule findings, passes, abstentions, confusion counts,
coverage, precision, recall, specificity, accuracy, and labeled case
probabilities. Abstentions are kept out of the confusion counts and reported
separately. Precision uses findings only; recall and specificity treat
abstentions as missed decisions; coverage is the share of non-abstained cases;
accuracy counts abstentions as incorrect, while decisive accuracy considers
only findings and passes. A metric with no applicable predictions is zero.
`finding` uses a 0.97 Jev Boolean probability, except authorization uses 0.99;
each rule has its own abstain threshold. Every result is marked `observe` and
does not fail the command.

The evaluator records the resolved model ID returned by the Gateway so model
alias changes are visible. The current Gateway model identifier is an alias,
so the resolved ID must be checked alongside probability changes during SDK or
model updates. The exact AI SDK dependency and fresh transitive releases have a
version-specific, temporary release-age exception documented in
`docs/policies/DEPENDENCIES.md` and `docs/policies/EXCEPTIONS.md`.
