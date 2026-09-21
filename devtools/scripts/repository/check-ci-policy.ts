import { readdirSync, readFileSync } from "node:fs";
import nodePath from "node:path";
import { parse } from "yaml";
import { z } from "zod";

type Permission = "read" | "write" | "none";
type PermissionSet = Record<string, Permission>;
const permissionSetSchema = z.record(z.string(), z.enum(["read", "write", "none"])),
  jobSchema = z.looseObject({
    permissions: permissionSetSchema.optional(),
  }),
  workflowSchema = z.looseObject({
    jobs: z.record(z.string(), jobSchema).optional(),
    permissions: permissionSetSchema.optional(),
  }),
  shaPinnedAction = /uses:\s+[^\s@]+@[0-9a-f]{40}(?:\s|$)/u,
  mutableAction = /uses:\s+[^\s@]+@[^\s#]+/u,
  allowedPermissions: Record<
    string,
    { workflow: PermissionSet; jobs: Record<string, PermissionSet> }
  > = {
    "actionlint.yml": { workflow: { contents: "read" }, jobs: {} },
    "check.yml": { workflow: { contents: "read" }, jobs: {} },
    "jev-eval.yml": {
      workflow: { contents: "read" },
      jobs: { evaluate: { contents: "read" } },
    },
    "codeql.yml": {
      workflow: { contents: "read" },
      jobs: { analyze: { contents: "read", "security-events": "read" } },
    },
    "dependency-review.yml": {
      workflow: { contents: "read" },
      jobs: {},
    },
    "osv-scanner.yml": {
      workflow: { actions: "read", contents: "read", "security-events": "write" },
      jobs: {},
    },
    "osv-scheduled.yml": {
      workflow: { contents: "read" },
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
  },
  failures: string[] = [];

function checkPermissionSet(
  file: string,
  scope: string,
  permissionConfiguration: unknown,
  allowed: PermissionSet,
): void {
  const permissionSet = permissionSetSchema.safeParse(permissionConfiguration);
  if (!permissionSet.success) {
    failures.push(`${file}: ${scope} permissions must be an explicit mapping`);
    return;
  }
  for (const [permission, level] of Object.entries(permissionSet.data)) {
    if (!(permission in allowed)) {
      failures.push(`${file}: ${scope} permission is not allowlisted: ${permission}`);
    } else if (level !== allowed[permission]) {
      failures.push(
        `${file}: ${scope} permission ${permission} must be ${allowed[permission]}`,
      );
    }
  }
}

function checkActionPins(path: string, contents: string): void {
  for (const [index, line] of contents.split("\n").entries()) {
    if (mutableAction.test(line) && !shaPinnedAction.test(line)) {
      failures.push(
        `${path}:${index + 1}: action must be pinned to a 40-character commit SHA`,
      );
    }
  }
}

function checkJobPermissions(
  path: string,
  jobs: Record<string, z.infer<typeof jobSchema>>,
  allowedJobs: Record<string, PermissionSet>,
): void {
  for (const [jobName, jobValue] of Object.entries(jobs)) {
    const allowed = allowedJobs[jobName];
    if (jobValue.permissions && allowed) {
      checkPermissionSet(path, `job ${jobName}`, jobValue.permissions, allowed);
    } else if (jobValue.permissions) {
      failures.push(`${path}: job ${jobName} has no permission policy`);
    }
  }
}

function checkWorkflow(file: string): void {
  const path = nodePath.join(".github/workflows", file);
  const contents = readFileSync(path, "utf8");
  const policy = allowedPermissions[file];
  if (!policy) {
    failures.push(`${path}: workflow has no permission policy`);
    return;
  }
  checkActionPins(path, contents);
  const documentResult = workflowSchema.safeParse(parse(contents));
  if (documentResult.success) {
    const document = documentResult.data;
    if (document.permissions) {
      checkPermissionSet(path, "workflow", document.permissions, policy.workflow);
    }
    if (document.jobs) {
      checkJobPermissions(path, document.jobs, policy.jobs);
    }
  } else {
    failures.push(`${path}: workflow must parse as a mapping`);
  }
}

for (const file of readdirSync(".github/workflows")) {
  if (file.endsWith(".yml") || file.endsWith(".yaml")) {
    checkWorkflow(file);
  }
}

const actionlintWorkflow = readFileSync(".github/workflows/actionlint.yml", "utf8");
if (!actionlintWorkflow.includes("rhysd/actionlint@")) {
  failures.push(".github/workflows/actionlint.yml: actionlint is not configured");
}

const packageJsonSchema = z.object({
    scripts: z.record(z.string(), z.string()),
  }),
  packageJson = packageJsonSchema.safeParse(
    JSON.parse(readFileSync("package.json", "utf8")),
  ),
  ciWorkflow = readFileSync(".github/workflows/check.yml", "utf8");
let hasSemanticCheck = false;
if (packageJson.success) {
  const checkScript = packageJson.data.scripts.check;
  if (typeof checkScript === "string") {
    hasSemanticCheck = checkScript.includes("pnpm semantic:check");
  }
}
if (!hasSemanticCheck) {
  failures.push("package.json: check must run deterministic semantic validation");
}
if (!ciWorkflow.includes("pnpm check:all")) {
  failures.push(".github/workflows/check.yml: CI must run pnpm check:all");
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
}
