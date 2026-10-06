import baseConfig from "./oxlint.base.json" with { type: "json" };
import { REACT_DOCTOR_RULES } from "oxlint-plugin-react-doctor";
import projectProfile from "./project-profile.json" with { type: "json" };

const disabledRules = new Set<string>();
for (const [ruleName, severity] of Object.entries(baseConfig.rules)) {
  if (severity === "off") {
    disabledRules.add(ruleName);
  }
}
const selectedFrameworks = new Set(projectProfile.frameworks);
if (selectedFrameworks.has("react")) {
  selectedFrameworks.add("react-compiler");
}
const reactQualityRules: Record<string, "warn"> = {};
for (const entry of REACT_DOCTOR_RULES) {
  if (
    (entry.rule.framework === "global" ||
      selectedFrameworks.has(entry.rule.framework)) &&
    entry.key !== "react-doctor/no-multi-component-file" &&
    !(
      "disabledWhen" in entry.rule &&
      entry.rule.disabledWhen.some((capability) => selectedFrameworks.has(capability))
    )
  ) {
    const ruleName = entry.key.replace(/^react-doctor\//u, "react-quality/");
    if (!disabledRules.has(ruleName)) {
      reactQualityRules[ruleName] = "warn";
    }
  }
}
const config = {
  ...baseConfig,
  jsPlugins: [
    ...baseConfig.jsPlugins,
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
    ...reactQualityRules,
  },
  overrides: baseConfig.overrides,
};

export { config };
export default config;
