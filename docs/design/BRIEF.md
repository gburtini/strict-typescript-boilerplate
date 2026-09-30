# Reference workflow design brief

## Audience and direction

The reference UI helps developers learn a complete registration workflow. It
is not a production authentication system. Choose calm and precise: retain
the semantic Slate/Sky palette and system sans typography for fast loading.
The distinctive element is visible progress from input to saved result with
recovery in the same form. Clarity, accessibility, and speed take priority.

Alternatives for consuming projects include editorial display typography for
content products, or warm, playful colors for consumer tools. Choose audience,
references, and differentiation before feature UI work; do not inherit the
starter identity accidentally. Theme changes belong in tokens and primitives.

## Typography, hierarchy, and layout

Use the vocabulary in `docs/policies/DESIGN.md`. Body copy starts at `text-base`,
labels use `text-sm`, and headings constrain line length. Use one primary
action, descriptive labels, and quiet secondary actions. Group content with
consistent gaps and maintain readable paragraphs. Status uses text, not color
alone. Avoid decorative gradients, invented metrics, badges, and inert buttons.

## Interaction and state coverage

Explain what will be stored before registration. Validate on submission and
preserve input after invalid or failed requests. Immediately expose pending
state, prevent duplicate requests, and announce the outcome. Recovery repeats
the chosen action without losing input. Success shows the saved email.
No destructive action is part of this reference workflow.

## Responsive, accessibility, and motion

Use a single column at 320 CSS pixels and allow long email addresses to wrap.
Verify keyboard operation, visible focus, error focus, desktop and narrow
screens, 200% zoom/reflow, and reduced motion. The example needs no entrance
animation; announcements provide feedback. Shared controls live in `packages/ui`;
features own layout and copy.

## Review and update triggers

Browser tests capture initial, error, and success screenshots. Review hierarchy,
density, focus visibility, and recovery; screenshots are evidence, not automatic
aesthetic approval. Update the brief with audience, theme, layout, or interaction
changes. Consuming projects must add their own visual references and approved
screen examples.
