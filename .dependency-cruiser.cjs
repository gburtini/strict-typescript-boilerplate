/** @type {import("dependency-cruiser").IConfig} */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "no-tests-in-production",
      severity: "error",
      from: { path: "^src/", pathNot: "\\.test\\." },
      to: { path: "\\.test\\." },
    },
    {
      name: "ui-components-do-not-import-applications",
      severity: "error",
      from: { path: "^src/components/ui/" },
      to: { path: "^src/app" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
