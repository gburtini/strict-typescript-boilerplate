import { NodeSdk } from "@effect/opentelemetry";

/*
 * This module is the Node runtime assembly point for the telemetry layer; the
 * layer must not leak inward into application or domain modules.
 */
export const TelemetryLive = NodeSdk.layer(() => ({
  resource: { serviceName: "typescript-boilerplate" },
}));
