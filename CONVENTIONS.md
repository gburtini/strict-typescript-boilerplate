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

## Functions and control flow

- Braces are required.
- Handle every Promise by awaiting, returning, or explicitly using `void` for a
  deliberate detached operation.
- Handle errors intentionally; do not silently swallow catches or return errors
  as ordinary success values.
- Prefer one clear pass over multiple equivalent iterations.
- Keep functions within the configured complexity and size limits.

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
