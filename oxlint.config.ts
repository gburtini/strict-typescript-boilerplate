import baseConfig from "./oxlint.base.json" with { type: "json" };
import { ALL_REACT_DOCTOR_RULES } from "oxlint-plugin-react-doctor";

const reactQualityRules = Object.fromEntries(
  Object.keys(ALL_REACT_DOCTOR_RULES).map((ruleName) => [
    ruleName.replace(/^react-doctor\//u, "react-quality/"),
    "warn",
  ]),
);

const config = {
  ...baseConfig,
  jsPlugins: [
    ...(baseConfig.jsPlugins ?? []),
    {
      name: "@rikalabs",
      specifier: "@rikalabs/oxlint-standards/plugin",
    },
    {
      name: "react-quality",
      specifier: "oxlint-plugin-react-doctor",
    },
    {
      name: "drizzle",
      specifier: "eslint-plugin-drizzle",
    },
  ],
  rules: {
    ...baseConfig.rules,
    "react/exhaustive-deps": "off",
    "react/rules-of-hooks": "off",
    ...reactQualityRules,
    "react-quality/react-in-jsx-scope": "off",
    "@rikalabs/no-silent-catch-fallback": "error",
    "@rikalabs/no-runtime-compat-fallbacks": "error",
    "@rikalabs/no-catch-return-error-object": "error",
    "@rikalabs/no-unlisted-external-imports": "off",
    "@rikalabs/no-double-type-assertion": "error",
    "@rikalabs/no-ai-debt-comments": "error",
    "@rikalabs/no-json-parse-default-fallback": "error",
    "@rikalabs/no-json-stringify-default-fallback": "error",
    "@rikalabs/no-as-never": "error",
    "@rikalabs/no-todo-without-issue": "error",
    "@rikalabs/no-disable-without-rationale": "error",
    "@rikalabs/no-generic-module-names": "off",
    "@rikalabs/no-placeholder-implementation": "off",
    "@rikalabs/no-identical-branches": "error",
    "@rikalabs/no-copy-paste-exports": "error",
    "@rikalabs/no-trivial-runtime-guard-helpers": "error",
    "@rikalabs/no-trivial-property-helpers": "error",
    "@rikalabs/no-bare-wrapper-functions": "error",
    "@rikalabs/no-pass-through-intermediate-vars": "error",
    "@rikalabs/no-redundant-const-assertion": "error",
    "@rikalabs/no-tutorial-comments": "error",
    "@rikalabs/no-commented-out-code": "error",
    "@rikalabs/no-debug-residue-filenames": "error",
    "@rikalabs/no-low-signal-variable-names": "error",
    "@rikalabs/effect-no-async-await": "error",
    "@rikalabs/effect-no-generic-error-fail": "error",
    "@rikalabs/effect-no-layer-in-leaf-modules": "error",
    "@rikalabs/effect-no-or-die": "error",
    "@rikalabs/effect-no-promise-service-methods": "error",
    "@rikalabs/effect-no-provide-in-domain": "error",
    "@rikalabs/effect-no-terminal-runners": "error",
    "@rikalabs/effect-no-throw-in-services": "error",
    "@rikalabs/effect-no-try-catch": "error",
    "@rikalabs/effect-require-tagged-errors": "error",
    "@rikalabs/no-standalone-classes": "error",
    "@rikalabs/no-hardcoded-secrets": "error",
    "@rikalabs/no-sql-string-concat": "error",
    "@rikalabs/no-exported-any": "error",
    "@rikalabs/no-inline-exported-object-types": "error",
    "@rikalabs/no-bag-of-optionals": "error",
    "@rikalabs/require-branded-ids": "error",
    "@rikalabs/require-exhaustive-tag-switch": "error",
    "@rikalabs/no-relative-cross-package-imports": "error",
    "@rikalabs/no-cross-layer-imports": "error",
    "@rikalabs/no-placeholder-tests": "error",
    "@rikalabs/no-mock-only-tests": "error",
    "eslint/no-restricted-imports": [
      "error",
      {
        message:
          "Database implementation belongs in @template/db adapters; inject a repository or port instead.",
        patterns: ["drizzle-orm", "drizzle-orm/**"],
      },
      {
        message:
          "The Postgres driver belongs in @template/db; inject a database port instead.",
        name: "postgres",
      },
    ],
    "drizzle/enforce-delete-with-where": "error",
    "drizzle/enforce-update-with-where": "error",
    "vitest/no-conditional-tests": "error",
    "vitest/consistent-test-filename": "error",
    "vitest/prefer-called-once": "error",
    "vitest/prefer-called-times": "error",
    "vitest/prefer-to-be-falsy": "error",
    "vitest/prefer-to-be-truthy": "error",
    "vitest/prefer-to-be-object": "error",
  },
};

export default config;
