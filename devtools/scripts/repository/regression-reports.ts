import { z } from "zod";

const regressionReportSchema = z.object({
  success: z.boolean(),
  numFailedTests: z.number().int().nonnegative(),
  numPendingTests: z.literal(0),
  numTodoTests: z.literal(0),
  testResults: z
    .array(
      z.object({
        name: z.string(),
        message: z.literal(""),
        assertionResults: z
          .array(
            z.object({
              title: z.string(),
              status: z.enum(["passed", "failed"]),
              failureMessages: z.array(z.string()),
            }),
          )
          .min(1),
      }),
    )
    .length(1),
});

interface RegressionExpectation {
  readonly testPath: string;
  readonly title: string;
  readonly failure: string;
}

function verifyRegressionReport(
  input: unknown,
  expectation: RegressionExpectation,
  mutated: boolean,
): void {
  const report = regressionReportSchema.parse(input);
  const suite = report.testResults.find(
    (result) => result.name === expectation.testPath,
  );
  const assertion = suite?.assertionResults.find(
    (result) => result.title === expectation.title,
  );
  const failures = suite?.assertionResults.filter(
    (result) => result.status === "failed",
  );
  if (!assertion || !failures || report.numFailedTests !== failures.length) {
    throw new TypeError(
      "Regression report must identify the expected test and all failures",
    );
  }
  if (!mutated) {
    if (!report.success || failures.length > 0 || assertion.status !== "passed") {
      throw new TypeError("Regression baseline must pass before mutation");
    }
    return;
  }
  if (
    report.success ||
    assertion.status !== "failed" ||
    !assertion.failureMessages.some((message) => message.includes(expectation.failure))
  ) {
    throw new TypeError(
      "Mutation must fail the expected assertion for the intended reason",
    );
  }
}

export { verifyRegressionReport };
