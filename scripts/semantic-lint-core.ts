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
  corpusSchema = z.object({
    schemaVersion: z.literal(1),
    cases: z.array(caseSchema).min(1),
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
  predicted: boolean;
}
interface RuleSummary {
  rule: string;
  cases: number;
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  precision: number;
  recall: number;
  specificity: number;
  accuracy: number;
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

function parseCorpus(input: unknown, config: SemanticConfig): SemanticCase[] {
  const corpus = corpusSchema.parse(input),
    ruleIds = config.rules.map((rule) => rule.id),
    expectedIds = new Set(ruleIds);
  for (const evalCase of corpus.cases) {
    const actualIds = Object.keys(evalCase.expected);
    if (
      actualIds.length !== expectedIds.size ||
      actualIds.some((id) => !expectedIds.has(id))
    ) {
      throw new TypeError(
        `fixture ${evalCase.id} expected keys must exactly match configured rule IDs`,
      );
    }
  }
  for (const ruleId of ruleIds) {
    const positiveCount = corpus.cases.filter(
        (evalCase) => evalCase.expected[ruleId] === true,
      ).length,
      negativeCount = corpus.cases.length - positiveCount;
    if (
      positiveCount < config.minimumExamplesPerLabel ||
      negativeCount < config.minimumExamplesPerLabel
    ) {
      throw new TypeError(
        `semantic evaluation corpus needs at least ${config.minimumExamplesPerLabel} positive and negative cases for ${ruleId}`,
      );
    }
  }
  return corpus.cases;
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
      truePositive = ruleOutcomes.filter(
        (outcome) => outcome.expected && outcome.predicted,
      ).length,
      falsePositive = ruleOutcomes.filter(
        (outcome) => !outcome.expected && outcome.predicted,
      ).length,
      trueNegative = ruleOutcomes.filter(
        (outcome) => !outcome.expected && !outcome.predicted,
      ).length,
      falseNegative = ruleOutcomes.filter(
        (outcome) => outcome.expected && !outcome.predicted,
      ).length;
    return {
      rule,
      cases: ruleOutcomes.length,
      truePositive,
      falsePositive,
      trueNegative,
      falseNegative,
      precision: ratio(truePositive, truePositive + falsePositive),
      recall: ratio(truePositive, truePositive + falseNegative),
      specificity: ratio(trueNegative, trueNegative + falsePositive),
      accuracy: ratio(truePositive + trueNegative, ruleOutcomes.length),
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
