# ADR 0002: Semantic design tokens and primitive-owned appearance

- Status: accepted
- Date: 2026-09-19

## Decision

UI code uses semantic shadcn/Tailwind tokens backed by one OKLCH palette. Raw
palette colors, arbitrary values, inline styles, unknown classes, and dynamic
class construction are errors. Reusable appearance belongs in a primitive's
variant API; callers may control only the layout categories allowed by the
component contract.

The starter palette is based on Tailwind Slate neutrals and Sky accents, with
semantic roles for background, foreground, card, popover, primary, secondary,
muted, accent, destructive, border, input, and ring.

## Consequences

New colors require a semantic token and a deliberate palette change. New spacing
or sizing requirements require an existing scale value or a named primitive
variant. The `packages/ui` implementation directory is exempt from caller-side
restyling rules because it owns the primitives themselves.
