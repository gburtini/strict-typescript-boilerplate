import { NodeSdk } from "@effect/opentelemetry";

export const TelemetryLive = NodeSdk.layer(() => ({
  resource: { serviceName: "typescript-boilerplate" },
}));
