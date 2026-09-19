import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "typescript-boilerplate-"));
const fixturePath = join(temporaryDirectory, "forbidden.browser.tsx");

writeFileSync(
  fixturePath,
  `import { useState } from "react";

export function ForbiddenFixture() {
  const [value] = useState(0);
  return <div className="bg-red-500 p-[13px]">{value}</div>;
}
`,
);

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "oxlint",
    "-c",
    join(process.cwd(), "oxlint.config.ts"),
    "--deny-warnings",
    fixturePath,
  ],
  { encoding: "utf8" },
);

rmSync(temporaryDirectory, { recursive: true, force: true });

const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const expectedFindings = ["shadcn(no-raw-colors)", "shadcn(no-arbitrary-values)"];
const missingFindings = expectedFindings.filter((finding) => !output.includes(finding));

if (result.status === 0 || missingFindings.length > 0) {
  console.error(output);
  console.error(`Missing enforcement findings: ${missingFindings.join(", ")}`);
  process.exitCode = 1;
}
