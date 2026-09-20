import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { spawnSync } from "node:child_process";

const temporaryDirectory = mkdtempSync(
  nodePath.join(tmpdir(), "typescript-boilerplate-"),
);
const databaseFixturePath = nodePath.join(temporaryDirectory, "forbidden-database.ts"),
  fixturePath = nodePath.join(temporaryDirectory, "forbidden.browser.tsx"),
  suppressionFixturePath = nodePath.join(
    temporaryDirectory,
    "forbidden-suppression.ts",
  ),
  testFixturePath = nodePath.join(temporaryDirectory, "forbidden.test.ts");

writeFileSync(
  fixturePath,
  `import { useState } from "react";

export function ForbiddenFixture() {
  const [value] = useState(0);
  return <div className="bg-red-500 p-[13px]">{value}</div>;
}

export const unsafe: any = 1;
export default ForbiddenFixture;
const secret = "sk_live_1234567890abcdef";
eval(secret);
declare function startWork(): Promise<void>;
startWork();
`,
);

writeFileSync(
  testFixturePath,
  'import { it } from "vitest";\nit.only("focused", () => {});\n',
);
const anonymousSuppression = [
  "// eslint",
  '-disable-next-line no-console\nconsole.log("forbidden");\n',
].join("");
writeFileSync(suppressionFixturePath, anonymousSuppression);
writeFileSync(
  databaseFixturePath,
  `import { sql } from "drizzle-orm";

declare const db: {
  delete: () => void;
  update: () => { set: () => void };
};

db.delete();
db.update().set();
sql.raw("untrusted");
`,
);

const directConfigResult = spawnSync(
  "pnpm",
  ["exec", "oxlint", "--print-config", fixturePath],
  { encoding: "utf8" },
);
const directConfigOutput = `${directConfigResult.stdout}\n${directConfigResult.stderr}`;
if (
  directConfigResult.status !== 0 ||
  !directConfigOutput.includes('"typescript/no-unsafe-type-assertion"')
) {
  process.stderr.write(`${directConfigOutput}\n`);
  process.stderr.write(
    "Oxlint direct config discovery did not load the repository config.\n",
  );
  process.exitCode = 1;
}

const lintResult = spawnSync(
    "pnpm",
    [
      "exec",
      "oxlint",
      "-c",
      nodePath.join(process.cwd(), "oxlint.config.ts"),
      "--deny-warnings",
      fixturePath,
      testFixturePath,
      databaseFixturePath,
      "--type-aware",
      "--type-check",
    ],
    { encoding: "utf8" },
  ),
  output = `${lintResult.stdout}\n${lintResult.stderr}`,
  expectedFindings = [
    "shadcn(no-raw-colors)",
    "shadcn(no-arbitrary-values)",
    "typescript(no-explicit-any)",
    "import(no-default-export)",
    "typescript(no-floating-promises)",
    "eslint(no-eval)",
    "vitest(no-focused-tests)",
    "@rikalabs(no-hardcoded-secrets)",
    "drizzle(enforce-delete-with-where)",
    "drizzle(enforce-update-with-where)",
    "eslint(no-restricted-imports)",
    "eslint(no-restricted-properties)",
  ],
  missingFindings = expectedFindings.filter((finding) => !output.includes(finding));

if (lintResult.status === 0 || missingFindings.length > 0) {
  process.stderr.write(`${output}\n`);
  process.stderr.write(`Missing enforcement findings: ${missingFindings.join(", ")}\n`);
  process.exitCode = 1;
}

const suppressionResult = spawnSync(
    "node",
    [
      "--experimental-strip-types",
      "scripts/check-exceptions.ts",
      suppressionFixturePath,
    ],
    { encoding: "utf8" },
  ),
  suppressionOutput = `${suppressionResult.stdout}\n${suppressionResult.stderr}`;
if (
  suppressionResult.status === 0 ||
  !suppressionOutput.includes("suppression requires a rationale")
) {
  process.stderr.write(`${suppressionOutput}\n`);
  process.stderr.write("Exception fixture did not reject an anonymous suppression.\n");
  process.exitCode = 1;
}

rmSync(temporaryDirectory, { recursive: true, force: true });
