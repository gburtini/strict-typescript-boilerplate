import { mkdir, readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { z } from "zod";
import {
  comparePlans,
  planArtifactSchema,
  renderComparison,
  type PlanArtifact,
} from "@template/db/devtools/query-plans";
import { resolveRepositoryPath } from "../shared/repository-paths.ts";

const comparisonArgumentsSchema = z.tuple([
  z.string().min(1),
  z.string().min(1),
  z.string().min(1).optional(),
]);

async function readPlanArtifact(path: string): Promise<PlanArtifact> {
  try {
    const document: unknown = JSON.parse(
      await readFile(resolveRepositoryPath(path), "utf8"),
    );
    return planArtifactSchema.parse(document);
  } catch (error) {
    throw new TypeError(`Plan artifact is invalid: ${path}`, { cause: error });
  }
}

const argumentsResult = comparisonArgumentsSchema.safeParse(process.argv.slice(2));
if (!argumentsResult.success) {
  throw new TypeError(
    "Usage: pnpm db:plans:compare <base.json> <current.json> [report.md]",
    { cause: argumentsResult.error },
  );
}
const [basePath, currentPath, reportPath = ".artifacts/query-plans.md"] =
  argumentsResult.data;
const [base, current] = await Promise.all([
  readPlanArtifact(basePath),
  readPlanArtifact(currentPath),
]);
const comparison = comparePlans(current, base);
const outputPath = resolveRepositoryPath(reportPath);
await mkdir(nodePath.dirname(outputPath), { recursive: true });
await writeFile(outputPath, renderComparison(comparison), "utf8");
if (comparison.violations.length > 0) {
  process.exitCode = 1;
}
