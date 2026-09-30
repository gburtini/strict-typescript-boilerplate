import { spawnSync } from "node:child_process";
import { readProjectProfile } from "./check-project-profile.ts";

const profile = readProjectProfile();
const commands = ["check"];
if (profile.capabilities.includes("database")) {
  commands.push("test:integration");
} else if (profile.capabilities.includes("browser")) {
  commands.push("build");
  if (profile.frameworks.includes("react")) {
    commands.push("compiler:check");
  }
  commands.push("test:e2e");
}
for (const command of commands) {
  const result = spawnSync("pnpm", [command], { stdio: "inherit" });
  if (result.error) {
    throw new Error(`Unable to run ${command}`, { cause: result.error });
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
