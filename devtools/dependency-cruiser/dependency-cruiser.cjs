/** @type {import("dependency-cruiser").IConfig} */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "no-tests-in-production",
      severity: "error",
      from: { path: "^(apps|packages)/", pathNot: "\\.test\\." },
      to: { path: "\\.test\\." },
    },
    {
      name: "packages-do-not-import-applications",
      severity: "error",
      from: { path: "(^|/)packages/" },
      to: { path: "(^|/)apps/" },
    },
    {
      name: "domain-does-not-import-outer-layers",
      severity: "error",
      from: { path: "(^|/)src/domain/" },
      to: { path: "(^|/)src/(application|infrastructure|adapters|ui)/" },
    },
    {
      name: "application-does-not-import-outer-layers",
      severity: "error",
      from: { path: "(^|/)src/application/" },
      to: { path: "(^|/)src/(infrastructure|adapters|ui)/" },
    },
    {
      name: "domain-does-not-import-runtime-capabilities",
      severity: "error",
      from: { path: "(^|/)src/domain/" },
      to: { path: "^(node:)?(fs|http|https|net|child_process|react)(/|$)" },
    },
    {
      name: "domain-does-not-import-node-builtins",
      severity: "error",
      from: { path: "(^|/)src/domain/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "browser-does-not-import-node-builtins",
      severity: "error",
      from: { path: "(^|/)apps/[^/]+/src/", pathNot: "(^|/)tests/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "browser-does-not-import-server-code",
      severity: "error",
      from: { path: "(^|/)apps/[^/]+/src/", pathNot: "(^|/)(tests|adapters/server)/" },
      to: {
        path: "(^|/)(server|packages/db)/|^(node:)?(fs|http|https|net|child_process)(/|$)",
      },
    },
    {
      name: "infrastructure-does-not-import-ui",
      severity: "error",
      from: { path: "(^|/)src/(infrastructure|adapters)/" },
      to: { path: "(^|/)src/ui/" },
    },
    {
      name: "domain-does-not-import-database-adapter",
      severity: "error",
      from: { path: "(^|/)src/domain/" },
      to: { path: "(^|/)packages/db/" },
    },
    {
      name: "application-does-not-import-database-adapter",
      severity: "error",
      from: { path: "(^|/)src/application/" },
      to: { path: "(^|/)packages/db/" },
    },
    {
      name: "ui-does-not-import-database-adapter",
      severity: "error",
      from: { path: "(^|/)packages/ui/" },
      to: { path: "(^|/)packages/db/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
