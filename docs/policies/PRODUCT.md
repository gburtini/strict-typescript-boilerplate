# Product acceptance

Before implementation define the user, intended outcome, scope, and observable
acceptance criteria. Identify the owner of every state and invariant. Explain
why an existing primitive or workflow cannot satisfy a new abstraction.

## Interaction matrix

Record feature evidence in `docs/features/`. Each concern needs behavior and a
test path, or an explicit reason it does not apply:

| Concern                     | Required decision                                             |
| --------------------------- | ------------------------------------------------------------- |
| Loading                     | Immediate feedback, cancellation and stale response ownership |
| Empty                       | Explain the next useful action                                |
| Success                     | Confirm completion and a useful next action                   |
| Validation                  | Identify the problem and preserve valid input                 |
| Failure                     | Recovery without losing work or leaking internals             |
| Permission                  | Server protection and meaningful client feedback              |
| Duplicate submission        | Prevention and server idempotency semantics                   |
| Keyboard and focus          | Tab order, activation, visible focus, error focus             |
| Destructive action          | Undo or explicit irreversible scope                           |
| Responsive and long content | Narrow screen, reflow, long/translated values                 |
| Reduced motion              | Preserve feedback without spatial animation                   |

`project-profile.json` selects the reference acceptance artifact and design
brief. Checks validate applicability and referenced evidence. Owners assess
screenshots and usefulness. Missing implementations cannot be marked inapplicable.

## Design brief and completion

Before substantial UI work define audience, tasks, priority, visual references
or alternatives, direction, typography, density, layout rhythm, motion,
responsive behavior, and acceptable screen examples. The starter brief is an
example, not a universal identity. Tokens and primitives remain authoritative.

Record tests, failure paths, screenshots, and remaining manual judgments in
the change description. Scans, coverage, and types cannot establish usefulness
or visual hierarchy. Critical workflows demonstrate completion and recovery.
