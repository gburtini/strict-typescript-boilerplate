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
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
