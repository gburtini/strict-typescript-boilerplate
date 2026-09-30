import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import nodePath from "node:path";
import { spawnSync } from "node:child_process";

const fixtureRoot = mkdtempSync(
  nodePath.join(process.cwd(), "apps", ".architecture-fixtures-"),
);
const boundaries = [
  {
    rule: "domain-does-not-import-node-builtins",
    from: "apps/reference/src/domain/policy.js",
    to: "node:crypto",
  },
  {
    rule: "browser-does-not-import-node-builtins",
    from: "apps/reference/src/components/view.js",
    to: "node:crypto",
  },
  {
    rule: "domain-does-not-import-outer-layers",
    from: "apps/reference/src/domain/policy.js",
    to: "apps/reference/src/infrastructure/store.js",
  },
  {
    rule: "domain-does-not-import-outer-layers",
    from: "apps/reference/src/domain/policy.js",
    to: "apps/reference/src/adapters/store.js",
  },
  {
    rule: "application-does-not-import-outer-layers",
    from: "apps/reference/src/application/use-case.js",
    to: "apps/reference/src/adapters/store.js",
  },
  {
    rule: "infrastructure-does-not-import-ui",
    from: "apps/reference/src/adapters/store.js",
    to: "apps/reference/src/ui/view.js",
  },
  {
    rule: "packages-do-not-import-applications",
    from: "packages/core/src/port.js",
    to: "apps/reference/src/domain/policy.js",
  },
  {
    rule: "domain-does-not-import-database-adapter",
    from: "apps/reference/src/domain/policy.js",
    to: "packages/db/src/store.js",
  },
  {
    rule: "application-does-not-import-database-adapter",
    from: "apps/reference/src/application/use-case.js",
    to: "packages/db/src/store.js",
  },
  {
    rule: "ui-does-not-import-database-adapter",
    from: "packages/ui/src/control.js",
    to: "packages/db/src/store.js",
  },
  {
    rule: "browser-does-not-import-server-code",
    from: "apps/reference/src/components/view.js",
    to: "apps/reference/server/runtime.js",
  },
];

function cruise(path: string): { status: number | null; output: string } {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "dependency-cruiser",
      "--validate",
      "--config",
      "dependency-cruiser.cjs",
      path,
    ],
    {
      encoding: "utf8",
      cwd: nodePath.join(process.cwd(), "devtools/dependency-cruiser"),
    },
  );
  if (result.error) {
    throw new Error("Unable to inspect architecture fixture", { cause: result.error });
  }
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

try {
  for (const [index, boundary] of boundaries.entries()) {
    const root = nodePath.join(fixtureRoot, String(index));
    const source = nodePath.join(root, boundary.from);
    const target = nodePath.join(root, boundary.to);
    mkdirSync(nodePath.dirname(source), { recursive: true });
    mkdirSync(nodePath.dirname(target), { recursive: true });
    writeFileSync(target, "export const capability = true;\n");
    const relative = nodePath.relative(nodePath.dirname(source), target);
    let fixture = `import { capability } from "./${relative}";\nexport const policy = capability;\n`;
    if (boundary.to.startsWith("node:")) {
      fixture = `import "${boundary.to}";\nexport const policy = true;\n`;
    }
    writeFileSync(source, fixture);
    const rejected = cruise(root);
    if (rejected.status === 0 || !rejected.output.includes(boundary.rule)) {
      throw new Error(
        `Architecture fixture failed to demonstrate ${boundary.rule}: ${rejected.output}`,
      );
    }
    writeFileSync(source, "export const policy = true;\n");
    const accepted = cruise(root);
    if (accepted.status !== 0) {
      throw new Error(`Valid architecture fixture rejected: ${accepted.output}`);
    }
  }
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
