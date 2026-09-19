export class ApplicationError extends Error {
  public readonly _tag = "ApplicationError";
  public readonly cause: unknown;

  public constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = "ApplicationError";
    this.cause = cause;
  }
}
