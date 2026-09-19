import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "typescript-boilerplate-"));
const fixturePath = join(temporaryDirectory, "forbidden.browser.tsx");
const testFixturePath = join(temporaryDirectory, "forbidden.test.ts");
const suppressionFixturePath = join(temporaryDirectory, "forbidden-suppression.ts");
const databaseFixturePath = join(temporaryDirectory, "forbidden-database.ts");

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

const lintResult = spawnSync(
  "pnpm",
  [
    "exec",
    "oxlint",
    "-c",
    join(process.cwd(), "oxlint.config.ts"),
    "--deny-warnings",
    fixturePath,
    testFixturePath,
    databaseFixturePath,
    "--type-aware",
    "--type-check",
  ],
  { encoding: "utf8" },
);

const output = `${lintResult.stdout}\n${lintResult.stderr}`;
const expectedFindings = [
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
];
const missingFindings = expectedFindings.filter((finding) => !output.includes(finding));

if (lintResult.status === 0 || missingFindings.length > 0) {
  console.error(output);
  console.error(`Missing enforcement findings: ${missingFindings.join(", ")}`);
  process.exitCode = 1;
}

const suppressionResult = spawnSync(
  "node",
  ["--experimental-strip-types", "scripts/check-exceptions.ts", suppressionFixturePath],
  { encoding: "utf8" },
);
const suppressionOutput = `${suppressionResult.stdout}\n${suppressionResult.stderr}`;
if (
  suppressionResult.status === 0 ||
  !suppressionOutput.includes("suppression requires a rationale")
) {
  console.error(suppressionOutput);
  console.error("Exception fixture did not reject an anonymous suppression.");
  process.exitCode = 1;
}

rmSync(temporaryDirectory, { recursive: true, force: true });
