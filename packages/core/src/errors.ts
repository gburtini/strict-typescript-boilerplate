export const asError = (cause: unknown): Error => {
  if (cause instanceof Error) {
    return cause;
  }
  return new Error("Non-Error failure", { cause });
};
