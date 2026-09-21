import { z } from "zod";

const ruleSchema = z.object({
    id: z.string().regex(/^[a-z][A-Za-z0-9]*$/u),
    version: z.number().int().positive(),
    type: z.literal("boolean"),
    mode: z.literal("observe"),
    instructions: z.string().min(1),
    criteria: z.object({ true: z.string().min(1), false: z.string().min(1) }),
    thresholds: z.object({
      finding: z.number().min(0).max(1),
      abstain: z.number().min(0).max(1),
    }),
  }),
  configSchema = z.object({
    schemaVersion: z.literal(1),
    model: z.string().min(1),
    evaluationInstructions: z.string().min(1),
    evaluationConcurrency: z.number().int().positive().max(32),
    minimumExamplesPerLabel: z.number().int().positive(),
    maximumStateCharacters: z.number().int().positive(),
    rules: z.array(ruleSchema).min(1),
  }),
  stateSchema = z.object({
    change: z.string().min(1),
    relatedContext: z.string(),
    testContext: z.string(),
  }),
  caseSchema = z.object({
    id: z.string().min(1),
    state: stateSchema,
    expected: z.record(z.string(), z.boolean()),
  }),
  violationsCaseSchema = z.object({
    id: z.string().min(1),
    state: stateSchema,
    violations: z.array(z.string()),
  }),
  corpusSchema = z.object({
    schemaVersion: z.literal(1),
    cases: z.array(caseSchema).min(1),
  });
const violationsCorpusSchema = z.object({
  schemaVersion: z.literal(1),
  labelRules: z.array(z.string()),
  cases: z.array(violationsCaseSchema),
});

interface SemanticRule {
  id: string;
  version: number;
  type: "boolean";
  mode: "observe";
  instructions: string;
  criteria: { true: string; false: string };
  thresholds: { finding: number; abstain: number };
}
interface SemanticConfig {
  schemaVersion: 1;
  model: string;
  evaluationInstructions: string;
  evaluationConcurrency: number;
  minimumExamplesPerLabel: number;
  maximumStateCharacters: number;
  rules: SemanticRule[];
}
interface SemanticState {
  [key: string]: string;
  change: string;
  relatedContext: string;
  testContext: string;
}
interface SemanticCase {
  id: string;
  state: SemanticState;
  expected: Record<string, boolean>;
}
interface RuleOutcome {
  caseId: string;
  rule: string;
  expected: boolean;
  probability: number;
  decision: "finding" | "abstain" | "pass";
}
interface RuleSummary {
  rule: string;
  cases: number;
  findings: number;
  passes: number;
  abstentions: number;
  abstainedPositive: number;
  abstainedNegative: number;
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  coverage: number;
  precision: number;
  recall: number;
  specificity: number;
  accuracy: number;
  decisiveAccuracy: number;
}

function parseConfig(input: unknown): SemanticConfig {
  const config = configSchema.parse(input),
    ruleIds = config.rules.map((rule) => rule.id);
  if (new Set(ruleIds).size !== ruleIds.length) {
    throw new TypeError("semantic rule IDs must be unique");
  }
  for (const rule of config.rules) {
    if (rule.thresholds.abstain > rule.thresholds.finding) {
      throw new TypeError(
        `abstain threshold must not exceed finding threshold for ${rule.id}`,
      );
    }
  }
  return config;
}

function parseCorpus(
  input: unknown,
  config: SemanticConfig,
  violationsInput: unknown,
): SemanticCase[] {
  const corpus = corpusSchema.parse(input),
    configuredRuleIds = new Set(config.rules.map((rule) => rule.id)),
    violationsCorpus = violationsCorpusSchema.parse(violationsInput);
  const labeledRuleIds = new Set<string>();
  for (const ruleId of violationsCorpus.labelRules) {
    labeledRuleIds.add(ruleId);
  }
  if (labeledRuleIds.size !== violationsCorpus.labelRules.length) {
    throw new TypeError("semantic fixture label rule IDs must be unique");
  }
  for (const ruleId of labeledRuleIds) {
    if (!configuredRuleIds.has(ruleId)) {
      throw new TypeError(`semantic fixture corpus labels unknown rule ${ruleId}`);
    }
  }
  const baseCases = corpus.cases.map((evalCase) => {
    const expectedIds = Object.keys(evalCase.expected);
    if (
      expectedIds.length === 0 ||
      expectedIds.some((id) => !configuredRuleIds.has(id))
    ) {
      throw new TypeError(
        `fixture ${evalCase.id} expected keys must be configured rule IDs`,
      );
    }
    return evalCase;
  });
  const violationsCases: SemanticCase[] = [];
  for (const evalCase of violationsCorpus.cases) {
    if (evalCase.violations.some((ruleId) => !labeledRuleIds.has(ruleId))) {
      throw new TypeError(
        `fixture ${evalCase.id} lists a violation outside its labeled rule set`,
      );
    }
    const expected: Record<string, boolean> = {};
    for (const ruleId of labeledRuleIds) {
      expected[ruleId] = evalCase.violations.includes(ruleId);
    }
    violationsCases.push({ ...evalCase, expected });
  }
  const cases = [...baseCases, ...violationsCases],
    caseIds = cases.map((evalCase) => evalCase.id);
  if (new Set(caseIds).size !== caseIds.length) {
    throw new TypeError("semantic fixture IDs must be unique");
  }
  for (const ruleId of configuredRuleIds) {
    const labeledCases = cases.filter((evalCase) =>
        Object.hasOwn(evalCase.expected, ruleId),
      ),
      positiveCount = labeledCases.filter(
        (evalCase) => evalCase.expected[ruleId] === true,
      ).length,
      negativeCount = labeledCases.length - positiveCount;
    if (
      positiveCount < config.minimumExamplesPerLabel ||
      negativeCount < config.minimumExamplesPerLabel
    ) {
      throw new TypeError(
        `semantic evaluation corpus needs at least ${config.minimumExamplesPerLabel} positive and negative cases for ${ruleId}`,
      );
    }
  }
  return cases;
}

function decisionFor(
  probability: number,
  thresholds: SemanticConfig["rules"][number]["thresholds"],
): "finding" | "abstain" | "pass" {
  if (probability >= thresholds.finding) {
    return "finding";
  }
  if (probability >= thresholds.abstain) {
    return "abstain";
  }
  return "pass";
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

function summarizeOutcomes(outcomes: RuleOutcome[], ruleIds: string[]): RuleSummary[] {
  return ruleIds.map((rule) => {
    const ruleOutcomes = outcomes.filter((outcome) => outcome.rule === rule),
      findings = ruleOutcomes.filter((outcome) => outcome.decision === "finding"),
      passes = ruleOutcomes.filter((outcome) => outcome.decision === "pass"),
      abstentions = ruleOutcomes.filter((outcome) => outcome.decision === "abstain"),
      truePositive = ruleOutcomes.filter(
        (outcome) => outcome.expected && outcome.decision === "finding",
      ).length,
      falsePositive = ruleOutcomes.filter(
        (outcome) => !outcome.expected && outcome.decision === "finding",
      ).length,
      trueNegative = ruleOutcomes.filter(
        (outcome) => !outcome.expected && outcome.decision === "pass",
      ).length,
      falseNegative = ruleOutcomes.filter(
        (outcome) => outcome.expected && outcome.decision === "pass",
      ).length;
    return {
      rule,
      cases: ruleOutcomes.length,
      findings: findings.length,
      passes: passes.length,
      abstentions: abstentions.length,
      abstainedPositive: abstentions.filter((outcome) => outcome.expected).length,
      abstainedNegative: abstentions.filter((outcome) => !outcome.expected).length,
      truePositive,
      falsePositive,
      trueNegative,
      falseNegative,
      coverage: ratio(findings.length + passes.length, ruleOutcomes.length),
      precision: ratio(truePositive, truePositive + falsePositive),
      recall: ratio(
        truePositive,
        truePositive +
          falseNegative +
          abstentions.filter((outcome) => outcome.expected).length,
      ),
      specificity: ratio(
        trueNegative,
        trueNegative +
          falsePositive +
          abstentions.filter((outcome) => !outcome.expected).length,
      ),
      accuracy: ratio(truePositive + trueNegative, ruleOutcomes.length),
      decisiveAccuracy: ratio(
        truePositive + trueNegative,
        findings.length + passes.length,
      ),
    };
  });
}

export {
  decisionFor,
  parseConfig,
  parseCorpus,
  summarizeOutcomes,
  type RuleOutcome,
  type SemanticCase,
  type SemanticConfig,
};
