# Conventions

These are the canonical forms for code in this repository. Oxfmt, Oxlint,
TypeScript, React Doctor, and custom rules enforce the mechanical parts.

## Modules

- ESM only; use `node:` for Node built-ins.
- Use named exports. Default exports are reserved for framework configuration
  files where the framework requires them.
- Import React APIs by their named form: `useState`, never `React.useState`.
- Use inline type specifiers when a statement mixes runtime and type imports.
- Keep imports at module scope and use public package entrypoints.
- Use kebab-case filenames.

## TypeScript

- Strict TypeScript is mandatory.
- Do not use `any`, `@ts-ignore`, or `@ts-nocheck`.
- Prefer `unknown` at untrusted boundaries and narrow it explicitly.
- Avoid assertions; validate or narrow values instead. An assertion requires a
  concrete reason that cannot be expressed through types or validation.
- Give functions and module boundaries explicit return types.
- Prefer discriminated unions over bags of optional fields for state machines.
- Keep exported types named and small.
- Use Zod 4 schemas at runtime boundaries and infer types from the schemas;
  never treat a TypeScript annotation as input validation.
- Use Effect for application/domain computations that can fail, retry, be
  cancelled, or need a span. Keep adapter effects at the boundary.

## Functions and control flow

- Braces are required.
- Handle every Promise by awaiting, returning, or attaching an explicit
  rejection path for deliberate detached work, such as
  `void task.catch(reportFailure)`.
- Handle errors intentionally; do not silently swallow catches or return errors
  as ordinary success values.
- Prefer one clear pass over multiple equivalent iterations.
- Keep functions within the configured complexity and size limits.

Numeric limits are smoke alarms, not a license to fragment cohesive code.
Locality, cohesion, and semantic clarity outrank satisfying a line, parameter,
or statement count. If a correct implementation needs to exceed a limit, use
the governed exception protocol and explain why extracting meaningless helpers
would make the code worse.

## React

- Keep render functions pure.
- Do not mutate props, state, hook results, or module globals.
- Follow hook rules and make effect dependencies explicit.
- Use functional components with explicit props and return types.
- Prefer semantic HTML and accessible queries in tests.
- Use existing `@template/ui` primitives before creating controls locally.

## Suppressions

Suppressions are exceptional. They must be narrow, adjacent to the affected
line, and explain the concrete reason. Anonymous lint or TypeScript suppressions
are invalid policy, even when the tool accepts them.
