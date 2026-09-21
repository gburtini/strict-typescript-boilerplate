import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import pathModule from "node:path";
import { experimental_evaluate as evaluate } from "ai";
import { z } from "zod";
import {
  decisionFor,
  parseConfig,
  parseCorpus,
  summarizeOutcomes,
  type RuleOutcome,
  type SemanticCase,
  type SemanticConfig,
} from "./semantic-lint-core.ts";

const changedPathsSchema = z.array(z.string().min(1).max(4096)),
  booleanAnswerSchema = z.object({
    type: z.literal("boolean"),
    probability: z.number().min(0).max(1),
  }),
  sourceDiffPaths = [
    "--",
    "apps",
    "packages",
    "devtools",
    "docs/policies",
    "quality",
    "package.json",
    "pnpm-workspace.yaml",
  ];

interface CliOptions {
  action: "check" | "eval" | "review";
  base: string;
  configPath: string;
}

function runGit(args: readonly string[]): string {
  return execFileSync("git", [...args], { encoding: "utf8" });
}

function readChangedPaths(args: readonly string[]): string[] {
  return changedPathsSchema.parse(
    runGit(args)
      .split("\n")
      .filter((path) => path.length > 0),
  );
}

function isSafeRepositoryFile(path: string, root: string): boolean {
  const absolutePath = pathModule.resolve(root, path),
    rootPrefix = `${root}/`;
  if (!absolutePath.startsWith(rootPrefix) || !existsSync(absolutePath)) {
    return false;
  }
  const realPath = realpathSync(absolutePath);
  return (
    realPath.startsWith(rootPrefix) &&
    !pathModule.isAbsolute(pathModule.relative(root, realPath))
  );
}

function sourcePaths(paths: readonly string[]): string[] {
  return paths.filter((path) =>
    [".ts", ".tsx", ".js", ".jsx"].includes(pathModule.extname(path)),
  );
}

function readSourceContext(paths: readonly string[], root: string): string {
  const selected = new Set<string>(),
    testPathPattern = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
  for (const path of sourcePaths(paths)) {
    selected.add(path);
    if (!testPathPattern.test(path)) {
      const extension = pathModule.extname(path),
        stem = path.slice(0, -extension.length);
      for (const testExtension of [".test.ts", ".test.tsx", ".spec.ts"]) {
        const testPath = `${stem}${testExtension}`;
        if (isSafeRepositoryFile(testPath, root)) {
          selected.add(testPath);
        }
      }
    }
  }
  const sections: string[] = [];
  let remaining = 90_000;
  for (const path of selected) {
    if (isSafeRepositoryFile(path, root)) {
      const content = readFileSync(pathModule.resolve(root, path), "utf8").slice(
          0,
          12_000,
        ),
        section = `\n--- ${path} ---\n${content}`;
      if (section.length > remaining) {
        break;
      }
      sections.push(section);
      remaining -= section.length;
    }
  }
  return sections.join("");
}

function readRepositoryPolicy(root: string): string {
  return [
    "AGENTS.md",
    "docs/policies/ARCHITECTURE.md",
    "docs/policies/CONVENTIONS.md",
    "docs/policies/TESTING.md",
  ]
    .filter((path) => isSafeRepositoryFile(path, root))
    .map(
      (path) =>
        `\n--- ${path} ---\n${readFileSync(pathModule.resolve(root, path), "utf8")}`,
    )
    .join("");
}

function collectChangedPaths(base: string): string[] {
  const committedPaths = readChangedPaths([
      "diff",
      "--name-only",
      "--diff-filter=ACMRD",
      `${base}...HEAD`,
      ...sourceDiffPaths,
    ]),
    workingPaths = readChangedPaths([
      "diff",
      "--name-only",
      "--diff-filter=ACMRD",
      "HEAD",
      ...sourceDiffPaths,
    ]),
    untrackedPaths = readChangedPaths([
      "ls-files",
      "--others",
      "--exclude-standard",
      ...sourceDiffPaths,
    ]);
  return [...new Set([...committedPaths, ...workingPaths, ...untrackedPaths])];
}

function collectDiff(base: string): string {
  return [
    runGit([
      "diff",
      "--no-ext-diff",
      "--unified=24",
      `${base}...HEAD`,
      ...sourceDiffPaths,
    ]),
    runGit(["diff", "--no-ext-diff", "--unified=24", "HEAD", ...sourceDiffPaths]),
  ].join("\n");
}

function changedState(
  base: string,
  maximumStateCharacters: number,
): SemanticCase["state"] {
  const root = realpathSync(process.cwd()),
    paths = collectChangedPaths(base),
    diff = collectDiff(base),
    state = {
      change: `${diff}\n\nChanged paths:\n${paths.join("\n")}`,
      relatedContext: `${readRepositoryPolicy(root)}\n\n${readSourceContext(paths, root)}`,
      testContext: readSourceContext(
        paths.filter((path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path)),
        root,
      ),
    };
  if (JSON.stringify(state).length > maximumStateCharacters) {
    throw new RangeError(
      `semantic-lint state exceeds ${maximumStateCharacters} characters; narrow the diff`,
    );
  }
  return state;
}

function readConfig(path: string): SemanticConfig {
  return parseConfig(JSON.parse(readFileSync(path, "utf8")));
}

function actionForFlag(flag: "--check" | "--eval"): "check" | "eval" {
  if (flag === "--check") {
    return "check";
  }
  return "eval";
}

function readEvalCorpus(root: string, config: SemanticConfig): SemanticCase[] {
  const fixturesPath = pathModule.resolve(root, "quality/semantic/evals/fixtures.json"),
    architecturePath = pathModule.resolve(
      root,
      "quality/semantic/evals/architecture.json",
    ),
    fixtures: unknown = JSON.parse(readFileSync(fixturesPath, "utf8")),
    architectureFixtures: unknown = JSON.parse(readFileSync(architecturePath, "utf8"));
  return parseCorpus(fixtures, config, architectureFixtures);
}

function expectRejected(action: () => unknown, message: string): void {
  try {
    action();
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes(message)) {
      return;
    }
    const wrappedError = new TypeError(
      `semantic policy validation failed for rejection case: ${message}`,
      {
        cause: error,
      },
    );
    throw wrappedError;
  }
  throw new TypeError(`semantic policy validation accepted invalid input: ${message}`);
}

function checkPolicyRejections(config: SemanticConfig, root: string): number {
  const cases = readEvalCorpus(root, config),
    [firstRule] = config.rules,
    [firstCase] = cases;
  if (!firstRule || !firstCase) {
    throw new TypeError("semantic policy requires at least one rule and fixture");
  }
  expectRejected(
    () => parseConfig({ ...config, rules: [...config.rules, firstRule] }),
    "must be unique",
  );
  expectRejected(
    () =>
      parseConfig({
        ...config,
        rules: config.rules.map((rule) => {
          if (rule.id !== firstRule.id) {
            return rule;
          }
          return { ...rule, thresholds: { finding: 0.5, abstain: 0.7 } };
        }),
      }),
    "abstain threshold",
  );
  expectRejected(
    () =>
      parseCorpus(
        {
          schemaVersion: 1,
          cases: [{ ...firstCase, expected: { unexpectedRule: false } }],
        },
        config,
        { schemaVersion: 1, labelRules: [], cases: [] },
      ),
    "expected keys must be configured rule IDs",
  );
  expectRejected(
    () =>
      parseCorpus(
        {
          schemaVersion: 1,
          cases: [
            {
              ...firstCase,
              expected: Object.fromEntries(
                config.rules.map((rule) => [rule.id, false]),
              ),
            },
          ],
        },
        config,
        { schemaVersion: 1, labelRules: [], cases: [] },
      ),
    "positive and negative cases",
  );
  return cases.length;
}

function checkEvalCorpus(root: string, config: SemanticConfig): void {
  const caseCount = checkPolicyRejections(config, root);
  process.stdout.write(
    `Semantic corpus valid: ${caseCount} labeled states across ${config.rules.length} rules.\n`,
  );
}

function makeQuestions(config: SemanticConfig): Record<
  string,
  {
    type: "boolean";
    instructions: string;
    criteria: { true: string; false: string };
  }
> {
  return Object.fromEntries(
    config.rules.map((rule) => [
      rule.id,
      {
        type: rule.type,
        instructions: `${config.evaluationInstructions}\n\n${rule.instructions}`,
        criteria: rule.criteria,
      },
    ]),
  );
}

async function evaluateState(
  state: SemanticCase["state"],
  config: SemanticConfig,
): Promise<
  | { ok: true; modelId: string; probabilities: Record<string, number> }
  | { ok: false; error: Error }
> {
  try {
    const questions = makeQuestions(config),
      result = await evaluate({
        model: config.model,
        state,
        questions,
      }),
      probabilities: Record<string, number> = {};
    for (const rule of config.rules) {
      probabilities[rule.id] = booleanAnswerSchema.parse(
        result.answers[rule.id],
      ).probability;
    }
    return { ok: true, modelId: result.response.modelId, probabilities };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { ok: false, error };
    }
    const wrappedError = new TypeError("Jev evaluation failed with a non-Error value", {
      cause: error,
    });
    throw wrappedError;
  }
}

type StateEvaluation = Awaited<ReturnType<typeof evaluateState>>;
interface CaseEvaluation {
  evalCase: SemanticCase;
  result: StateEvaluation;
}

async function evaluateCasesInBatches(
  cases: SemanticCase[],
  config: SemanticConfig,
  start = 0,
  completed: CaseEvaluation[] = [],
): Promise<CaseEvaluation[]> {
  if (start >= cases.length) {
    return completed;
  }
  const batch = cases.slice(start, start + config.evaluationConcurrency),
    batchResults: CaseEvaluation[] = [],
    nextIndex = { value: 0 };
  async function evaluateBatchWorker(): Promise<void> {
    const index = nextIndex.value;
    nextIndex.value += 1;
    const evalCase = batch[index];
    if (!evalCase) {
      return;
    }
    const caseConfig = {
      ...config,
      rules: config.rules.filter((rule) => Object.hasOwn(evalCase.expected, rule.id)),
    };
    batchResults[index] = {
      evalCase,
      result: await evaluateState(evalCase.state, caseConfig),
    };
    return evaluateBatchWorker();
  }
  const workers: Promise<void>[] = [];
  for (
    let index = 0;
    index < Math.min(config.evaluationConcurrency, batch.length);
    index += 1
  ) {
    workers.push(evaluateBatchWorker());
  }
  await Promise.all(workers);
  return evaluateCasesInBatches(cases, config, start + config.evaluationConcurrency, [
    ...completed,
    ...batchResults,
  ]);
}

async function runEval(root: string, config: SemanticConfig): Promise<void> {
  const cases = readEvalCorpus(root, config),
    evaluations = await evaluateCasesInBatches(cases, config);
  for (const { result } of evaluations) {
    if (!result.ok) {
      process.stderr.write(`${result.error.message}\n`);
      process.exitCode = 1;
      return;
    }
  }
  const outcomes: RuleOutcome[] = [];
  const resolvedModels = new Set<string>();
  for (const { evalCase, result } of evaluations) {
    if (!result.ok) {
      throw new TypeError("semantic evaluation result is missing", {
        cause: result.error,
      });
    }
    resolvedModels.add(result.modelId);
    for (const rule of config.rules) {
      if (Object.hasOwn(evalCase.expected, rule.id)) {
        const probability = z
            .number()
            .min(0)
            .max(1)
            .parse(result.probabilities[rule.id]),
          expected = z.boolean().parse(evalCase.expected[rule.id]);
        outcomes.push({
          caseId: evalCase.id,
          rule: rule.id,
          expected,
          probability,
          decision: decisionFor(probability, rule.thresholds),
        });
      }
    }
  }
  process.stdout.write(
    `${JSON.stringify({
      model: config.model,
      resolvedModels: [...resolvedModels],
      rules: config.rules.map((rule) => ({
        id: rule.id,
        version: rule.version,
        findingThreshold: rule.thresholds.finding,
        abstainThreshold: rule.thresholds.abstain,
        mode: rule.mode,
      })),
      summary: summarizeOutcomes(
        outcomes,
        config.rules.map((rule) => rule.id),
      ),
      outcomes,
    })}\n`,
  );
}

async function runReview(base: string, config: SemanticConfig): Promise<void> {
  const result = await evaluateState(
    changedState(base, config.maximumStateCharacters),
    config,
  );
  if (!result.ok) {
    process.stderr.write(`${result.error.message}\n`);
    process.exitCode = 1;
    return;
  }
  const rules = config.rules.map((rule) => {
    const probability = z.number().min(0).max(1).parse(result.probabilities[rule.id]);
    return {
      id: rule.id,
      version: rule.version,
      probability,
      decision: decisionFor(probability, rule.thresholds),
      mode: rule.mode,
    };
  });
  process.stdout.write(
    `${JSON.stringify({ model: config.model, resolvedModel: result.modelId, rules })}\n`,
  );
}

function parseArguments(args: string[]): CliOptions {
  let action: CliOptions["action"] = "check",
    actionSet = false,
    base = "origin/main",
    configPath = "quality/semantic/rules.json";
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--check" || arg === "--eval") {
      if (actionSet) {
        throw new TypeError("specify exactly one semantic-lint action");
      }
      actionSet = true;
      action = actionForFlag(arg);
    } else if (arg === "--base" || arg === "--config") {
      const value = args.at(index + 1) ?? "";
      if (value.length === 0) {
        throw new TypeError(`${arg} requires a value`);
      }
      if (arg === "--base") {
        if (actionSet) {
          throw new TypeError("specify exactly one semantic-lint action");
        }
        actionSet = true;
        action = "review";
        base = value;
      } else {
        configPath = value;
      }
      index += 1;
    } else {
      throw new TypeError(`unknown semantic-lint argument: ${arg}`);
    }
  }
  if (!actionSet) {
    throw new TypeError(
      "usage: check-semantic-lint.ts (--check | --eval | --base <git-ref>) [--config <path>]",
    );
  }
  return { action, base, configPath };
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2)),
    root = realpathSync(process.cwd()),
    configPath = pathModule.resolve(root, options.configPath),
    config = readConfig(configPath);
  if (options.action === "check") {
    checkEvalCorpus(root, config);
  } else if (options.action === "eval") {
    await runEval(root, config);
  } else {
    await runReview(options.base, config);
  }
}

await main();
