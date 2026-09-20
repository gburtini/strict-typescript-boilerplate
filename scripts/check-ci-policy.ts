import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

type Permission = "read" | "write" | "none";
type PermissionSet = Record<string, Permission>;

const shaPinnedAction = /uses:\s+[^\s@]+@[0-9a-f]{40}(?:\s|$)/u;
const mutableAction = /uses:\s+[^\s@]+@[^\s#]+/u;
const allowedPermissions: Record<
  string,
  { workflow: PermissionSet; jobs: Record<string, PermissionSet> }
> = {
  "actionlint.yml": { workflow: { contents: "read" }, jobs: {} },
  "check.yml": { workflow: { contents: "read" }, jobs: {} },
  "codeql.yml": {
    workflow: { contents: "read" },
    jobs: { analyze: { contents: "read", "security-events": "write" } },
  },
  "dependency-review.yml": {
    workflow: { contents: "read" },
    jobs: {},
  },
  "osv-scanner.yml": {
    workflow: { actions: "read", contents: "read", "security-events": "write" },
    jobs: {},
  },
  "query-plans.yml": {
    workflow: { contents: "read", "pull-requests": "write" },
    jobs: {},
  },
  "semgrep.yml": {
    workflow: { contents: "read", "security-events": "write" },
    jobs: {},
  },
};
const failures: string[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkPermissionSet(
  file: string,
  scope: string,
  value: unknown,
  allowed: PermissionSet,
): void {
  if (!isRecord(value)) {
    failures.push(`${file}: ${scope} permissions must be an explicit mapping`);
    return;
  }
  for (const [permission, level] of Object.entries(value)) {
    if (!(permission in allowed)) {
      failures.push(`${file}: ${scope} permission is not allowlisted: ${permission}`);
      continue;
    }
    if (level !== allowed[permission]) {
      failures.push(
        `${file}: ${scope} permission ${permission} must be ${allowed[permission]}`,
      );
    }
  }
}

for (const file of readdirSync(".github/workflows")) {
  if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
  const path = join(".github/workflows", file);
  const contents = readFileSync(path, "utf8");
  const policy = allowedPermissions[file];
  if (policy === undefined) {
    failures.push(`${path}: workflow has no permission policy`);
    continue;
  }
  for (const [index, line] of contents.split("\n").entries()) {
    if (mutableAction.test(line) && !shaPinnedAction.test(line)) {
      failures.push(
        `${path}:${index + 1}: action must be pinned to a 40-character commit SHA`,
      );
    }
  }

  const document: unknown = parse(contents);
  if (!isRecord(document)) {
    failures.push(`${path}: workflow must parse as a mapping`);
    continue;
  }
  if (document.permissions !== undefined) {
    checkPermissionSet(path, "workflow", document.permissions, policy.workflow);
  }
  if (!isRecord(document.jobs)) continue;
  for (const [jobName, jobValue] of Object.entries(document.jobs)) {
    if (!isRecord(jobValue) || jobValue.permissions === undefined) continue;
    const allowed = policy.jobs[jobName];
    if (allowed === undefined) {
      failures.push(`${path}: job ${jobName} has no permission policy`);
      continue;
    }
    checkPermissionSet(path, `job ${jobName}`, jobValue.permissions, allowed);
  }
}

const actionlintWorkflow = readFileSync(".github/workflows/actionlint.yml", "utf8");
if (!actionlintWorkflow.includes("rhysd/actionlint@")) {
  failures.push(".github/workflows/actionlint.yml: actionlint is not configured");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
