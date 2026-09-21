# Design System

UI is composed from `@template/ui` primitives and the semantic Tailwind/shadcn
tokens declared in `apps/web/src/styles.css`. This is a closed vocabulary:
call sites must use the vocabulary below rather than inventing visual values.
`@shadcn/lint` enforces the parts of this contract that can be checked from
JSX and class names.

## Canonical visual vocabulary

| Concern            | Canonical vocabulary                                                                                                                                                  | Forbidden at call sites                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Colors             | Semantic roles: `background`, `foreground`, `card`, `muted`, `accent`, `primary`, `secondary`, `destructive`, `border`, `input`, `ring` and their foreground variants | Raw palette classes, hex/rgb/oklch values, one-off color tokens                                  |
| Spacing and sizing | Tailwind's default four-based spacing scale: `0` through `96`, with the standard fractional values where provided                                                     | Arbitrary values such as `p-[13px]`, one-off CSS lengths, repeated magic dimensions              |
| Typography         | `font-sans`; `text-xs` through `text-6xl`; `font-normal`, `font-medium`, `font-semibold`, `font-bold`; standard leading and tracking utilities                        | Inline font declarations, arbitrary font sizes, per-component font families                      |
| Radius             | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`                                                                                                | Arbitrary radii and new radius variables at feature call sites                                   |
| Shadows            | Tailwind `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`                                                                                                 | Arbitrary shadows and bespoke elevation values                                                   |
| Breakpoints        | `sm`, `md`, `lg`, `xl`, `2xl`                                                                                                                                         | Pixel media queries and JavaScript viewport branching                                            |
| Motion             | `duration-150`, `duration-200`, `duration-300`; `ease-in`, `ease-out`, `ease-in-out`; `motion-safe` and `motion-reduce`                                               | Arbitrary durations/easing, `transition-all`, and motion that ignores reduced-motion preferences |
| Icons              | One icon family per repository: Lucide icons when an icon dependency is present; semantic icon sizes `size-4`, `size-5`, `size-6`                                     | Emoji as UI icons, inline ad-hoc SVGs, mixed icon libraries, arbitrary icon dimensions           |
| Controls           | `h-8`, `h-9`, `h-10`, `h-11`; use the component's named size variant                                                                                                  | Arbitrary control heights and caller-owned control chrome                                        |
| Layering           | `z-0`, `z-10`, `z-20`, `z-30`, `z-40`, `z-50`, with the smallest suitable layer                                                                                       | Arbitrary z-index values and unexplained stacking contexts                                       |

The starter palette is intentionally small: Tailwind Slate neutrals with Sky
accents represented in OKLCH. Add a semantic token only when an existing role
cannot express the product meaning. Do not add a raw value to avoid choosing
the correct role.

The standard control heights have these meanings: `h-8` compact controls,
`h-9` small controls, `h-10` default controls, and `h-11` large controls.
Primitives own this choice through named variants; callers do not override it.

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

- Use only the canonical vocabulary above.
- Arbitrary values are errors outside primitive implementation code.
- Raw colors, unknown classes, dynamic class construction, and primitive
  restyling are errors through `@shadcn/lint`.
- Keep class names statically discoverable; do not construct them from
  arbitrary strings.
- Use layout classes at call sites and appearance classes inside primitives.
- Keep nesting shallow; React Doctor's JSX-depth rule is part of the policy.

## Exceptions

Only design-system implementation files may use low-level values that are
needed to implement a primitive. Such values must remain in
`packages/ui/src/components/ui/` or the theme layer, never in application
features. A new token or primitive variant is preferred over an exception.

## Accessibility and responsive behavior

Use semantic elements before ARIA. Interactive elements must be keyboard
accessible. Form controls require labels. Images need intentional alternative
text. Do not remove focus indicators without an equivalent treatment.

Prefer intrinsic, container-driven responsive layouts over JavaScript viewport
detection. Verify user-visible accessibility with the Playwright/axe workflow.

## Enforcement boundary

The following are executable repository rules:

- `shadcn/no-raw-colors` rejects non-semantic colors.
- `shadcn/no-arbitrary-values` rejects ad-hoc dimensions, radii, shadows, and
  other bracket values.
- `shadcn/no-unknown-classes` rejects classes outside the Tailwind/theme
  vocabulary.
- `shadcn/require-static-classes` rejects runtime-composed class names.
- `shadcn/no-restyle` rejects feature code that redefines primitive appearance.

The token table above is the design decision that gives those checks a single
meaning. Do not weaken the checks to permit a local variation; extend the
design system deliberately when a genuinely reusable need is discovered.
