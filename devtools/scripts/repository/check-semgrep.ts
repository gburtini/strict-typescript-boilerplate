import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import nodePath from "node:path";
import { tmpdir } from "node:os";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { expectRejection } from "../shared/expect-rejection.ts";
import {
  semgrepConfigurationSchema,
  semgrepFixturesSchema,
  semgrepPermissionsSchema,
  validateSemgrepPermissions,
} from "./semgrep-contracts.ts";

const image =
  "semgrep/semgrep:1.176.1@sha256:34ab619bf1391a24bfda3f05debd0d8a6ce3093c2d5f9d39cfc00f83c1397823";
const scanSchema = z.object({
  results: z.array(z.object({ check_id: z.string(), path: z.string() })),
  errors: z.array(z.unknown()),
  paths: z.object({ scanned: z.array(z.string()) }),
});
const configuration = semgrepConfigurationSchema.parse(
  parse(readFileSync(".semgrep.yml", "utf8")),
);
const registry = semgrepPermissionsSchema.parse(
  JSON.parse(readFileSync("devtools/quality/semgrep/permissions.json", "utf8")),
);
const { fixtures } = semgrepFixturesSchema.parse(
  JSON.parse(readFileSync("devtools/quality/semgrep/fixtures.json", "utf8")),
);
validateSemgrepPermissions(configuration, registry);

function runSemgrep(root: string, arguments_: readonly string[]): string {
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--network=none",
      "--volume",
      `${root}:/src:ro`,
      "--workdir",
      "/src",
      "--env",
      "SEMGREP_SEND_METRICS=off",
      "--env",
      "SEMGREP_ENABLE_VERSION_CHECK=0",
      image,
      "semgrep",
      ...arguments_,
    ],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error) {
    throw new Error("Unable to launch pinned Semgrep container", {
      cause: result.error,
    });
  }
  if (result.status !== 0) {
    throw new Error(
      `Semgrep failed (${String(result.status)}): ${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

function scan(root: string): z.infer<typeof scanSchema> {
  return scanSchema.parse(
    JSON.parse(
      runSemgrep(root, [
        "scan",
        "--config",
        ".semgrep.yml",
        "--strict",
        "--disable-nosem",
        "--metrics=off",
        "--json",
        ".",
      ]),
    ),
  );
}

function checkFixtures(root: string): void {
  const report = scan(root);
  if (
    report.errors.length > 0 ||
    new Set(fixtures.map((fixture) => fixture.path)).size !== fixtures.length ||
    report.paths.scanned.length !== fixtures.length ||
    fixtures.some((fixture) => !report.paths.scanned.includes(fixture.path))
  ) {
    throw new Error("Semgrep must scan every fixture without analysis errors");
  }
  for (const fixture of fixtures) {
    const actual = report.results
      .filter((finding) => finding.path === fixture.path)
      .map((finding) => finding.check_id)
      .toSorted();
    if (JSON.stringify(actual) !== JSON.stringify(fixture.expected.toSorted())) {
      throw new Error(
        `Semgrep fixture ${fixture.path}: expected ${JSON.stringify(fixture.expected)}, received ${JSON.stringify(actual)}`,
      );
    }
  }
  for (const rule of configuration.rules) {
    const bad = fixtures.find((fixture) => fixture.path === `cases/${rule.id}-bad.ts`);
    const good = fixtures.find(
      (fixture) => fixture.path === `cases/${rule.id}-good.ts`,
    );
    if (bad?.expected.includes(rule.id) !== true || good?.expected.length !== 0) {
      throw new Error(
        `Semgrep rule requires positive and negative fixtures: ${rule.id}`,
      );
    }
  }
}

function checkPermissionEvidence(root: string): void {
  const unrestricted = {
    rules: configuration.rules.map((rule) => {
      const unrestrictedRule = { ...rule };
      delete unrestrictedRule.paths;
      return unrestrictedRule;
    }),
  };
  writeFileSync(nodePath.join(root, ".semgrep.yml"), stringify(unrestricted));
  const report = scan(root);
  for (const permission of registry.permissions) {
    for (const path of permission.scope) {
      if (
        !report.results.some(
          (finding) =>
            finding.path === path.slice(1) && finding.check_id === permission.rule,
        )
      ) {
        throw new Error(
          `Semgrep permission has no demonstrated boundary operation: ${permission.rule} ${path}`,
        );
      }
    }
  }
}

function checkRepository(): void {
  const files = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { encoding: "utf8" },
  );
  if (files.error || files.status !== 0) {
    throw new Error(`Unable to inventory repository source: ${files.stderr}`, {
      cause: files.error,
    });
  }
  const report = scan(process.cwd());
  const missing = files.stdout
    .split("\n")
    .filter(
      (path) =>
        /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/u.test(path) &&
        !report.paths.scanned.includes(path),
    );
  if (report.errors.length > 0 || report.results.length > 0 || missing.length > 0) {
    throw new Error(
      `Semgrep repository scan failed: ${JSON.stringify({ errors: report.errors, findings: report.results, missing })}`,
    );
  }
}

expectRejection(
  () => validateSemgrepPermissions(configuration, { ...registry, permissions: [] }),
  "match approved",
);
expectRejection(
  () =>
    validateSemgrepPermissions(
      {
        rules: [
          ...configuration.rules,
          {
            id: "invalid",
            severity: "ERROR",
            paths: { exclude: ["/apps/web/src/adapters/registration-client.ts"] },
          },
        ],
      },
      registry,
    ),
  "Only boundary",
);
for (const permission of registry.permissions) {
  const otherPermissions = registry.permissions.filter(
    (entry) => entry.rule !== permission.rule,
  );
  expectRejection(
    () =>
      validateSemgrepPermissions(configuration, {
        ...registry,
        permissions: [...otherPermissions, { ...permission, expiry: "2000-01-01" }],
      }),
    "Expired Semgrep permission",
  );
  expectRejection(
    () =>
      validateSemgrepPermissions(configuration, {
        ...registry,
        permissions: [...otherPermissions, { ...permission, scope: ["/apps/**"] }],
      }),
    "Invalid string",
  );
  expectRejection(
    () =>
      validateSemgrepPermissions(configuration, {
        ...registry,
        permissions: [
          ...otherPermissions,
          { ...permission, tracking: "missing-semgrep-owner-record.md" },
        ],
      }),
    "missing file",
  );
}
const fixtureRoot = mkdtempSync(nodePath.join(tmpdir(), "semgrep-fixtures-"));
try {
  writeFileSync(nodePath.join(fixtureRoot, ".semgrep.yml"), stringify(configuration));
  for (const fixture of fixtures) {
    const path = nodePath.join(fixtureRoot, fixture.path);
    mkdirSync(nodePath.dirname(path), { recursive: true });
    writeFileSync(path, fixture.code);
  }
  checkFixtures(fixtureRoot);
  checkPermissionEvidence(fixtureRoot);
  writeFileSync(
    nodePath.join(fixtureRoot, ".semgrep.yml"),
    stringify({
      rules: configuration.rules.filter(
        (rule) => rule.id !== "no-eval-or-dynamic-function",
      ),
    }),
  );
  expectRejection(
    () => checkFixtures(fixtureRoot),
    "cases/no-eval-or-dynamic-function-bad.ts",
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
checkRepository();
process.stdout.write(
  `Semgrep rules, ${fixtures.length} fixtures, permissions, and repository scan passed.\n`,
);
