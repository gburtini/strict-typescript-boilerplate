# Design System

UI is composed from `@template/ui` primitives and semantic Tailwind/shadcn
tokens. `@shadcn/lint` enforces the class, color, and component contracts.

## Components and variants

- Search `packages/ui/src/components/ui/` before creating a component.
- Extend an existing primitive when the semantics match.
- Use explicit variants for recurring visual differences.
- Do not copy a primitive into an application feature.
- Do not move feature-specific business concepts into the design system.

Prefer:

```tsx
<Button variant="destructive">Delete</Button>
```

over caller-owned appearance classes.

## Styling ownership

Primitives own appearance. Callers own layout.

Callers may control placement, width constraints, grid position, flex behavior,
and surrounding layout margins when the component contract permits it. Callers
must not redefine a primitive's colors, typography, borders, shadows, internal
spacing, or interaction states.

`packages/ui` is the implementation boundary and has the narrow documented
lint overrides required to implement primitives.

## Tokens and palette

Use semantic roles such as `background`, `foreground`, `muted`, `accent`,
`destructive`, `border`, `input`, and `ring`. The starter palette is Tailwind
Slate neutrals with Sky accents represented in OKLCH under
`apps/web/src/styles.css`.

Do not introduce raw palette colors when a semantic token exists. If a reusable
color is genuinely missing, add a deliberate semantic token and a primitive
variant rather than repeating a raw value.

## Tailwind and layout

- Use the existing spacing and sizing scale.
- Arbitrary values are errors outside primitive implementation code.
- Keep class names statically discoverable.
- Do not construct class names from arbitrary strings.
- Use layout classes at call sites and appearance classes inside primitives.
- Keep nesting shallow; React Doctor's JSX-depth rule is part of the policy.

## Accessibility and responsive behavior

Use semantic elements before ARIA. Interactive elements must be keyboard
accessible. Form controls require labels. Images need intentional alternative
text. Do not remove focus indicators without an equivalent treatment.

Prefer intrinsic, container-driven responsive layouts over JavaScript viewport
detection. Verify user-visible accessibility with the Playwright/axe workflow.
