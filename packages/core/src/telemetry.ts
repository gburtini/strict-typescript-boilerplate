import { SpanStatusCode, trace } from "@opentelemetry/api";
import { Effect } from "effect";

const instrumentationName = "@template/core",
  recordFailure = (cause: unknown): void => {
    const span = trace.getActiveSpan();
    if (!span) {
      return;
    }
    let error = new Error("Non-Error failure", { cause });
    if (cause instanceof Error) {
      error = cause;
    }
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: "operation failed" });
  },
  withSpan = <Value, Failure, Requirements>(
    name: string,
    effect: Effect.Effect<Value, Failure, Requirements>,
  ): Effect.Effect<Value, Failure, Requirements> => Effect.withSpan(effect, name);

export { instrumentationName, recordFailure, withSpan };
