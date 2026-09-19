export class InfrastructureError extends Error {
  public readonly _tag = "InfrastructureError";
  public readonly adapter: string;
  public readonly cause: unknown;

  public constructor(message: string, adapter: string, cause: unknown) {
    super(message, { cause });
    this.name = "InfrastructureError";
    this.adapter = adapter;
    this.cause = cause;
  }
}
