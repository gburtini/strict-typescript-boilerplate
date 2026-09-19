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
      name: "ui-components-do-not-import-applications",
      severity: "error",
      from: { path: "^packages/ui/" },
      to: { path: "^apps/" },
    },
    {
      name: "domain-does-not-import-outer-layers",
      severity: "error",
      from: { path: "(^|/)src/domain/" },
      to: { path: "(^|/)src/(application|infrastructure|ui)/" },
    },
    {
      name: "application-does-not-import-outer-layers",
      severity: "error",
      from: { path: "(^|/)src/application/" },
      to: { path: "(^|/)src/(infrastructure|ui)/" },
    },
    {
      name: "infrastructure-does-not-import-ui",
      severity: "error",
      from: { path: "(^|/)src/infrastructure/" },
      to: { path: "(^|/)src/ui/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
