# Browser tests

Use browser tests only for externally observable workflows and accessibility
behavior that lower-level tests cannot prove.

- Do not use arbitrary sleeps.
- Wait on visible, semantic application state.
- Prefer roles, labels, and stable accessible names over CSS selectors.
- Keep tests isolated and safe to run in parallel.
- Do not duplicate unit tests unless the browser interaction is the behavior
  under test.
- Run `pnpm test:e2e` after changes to this subtree.
