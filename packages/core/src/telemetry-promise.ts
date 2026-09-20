import { trace } from "@opentelemetry/api";
import { instrumentationName, recordFailure } from "./telemetry";

const withSpanPromise = async <Value>(
  name: string,
  operation: () => Promise<Value>,
): Promise<Value> => {
  const result = await trace
    .getTracer(instrumentationName)
    .startActiveSpan(name, async (span) => {
      try {
        return { value: await operation() };
      } catch (error) {
        recordFailure(error);
        throw error;
      } finally {
        span.end();
      }
    });
  return result.value;
};

export { withSpanPromise };
