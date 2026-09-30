function expectRejection(action: () => unknown, message: string): void {
  try {
    action();
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes(message)) {
      return;
    }
    throw new Error(`Unexpected rejection for ${message}`, { cause: error });
  }
  throw new Error(`Invalid fixture was accepted: ${message}`);
}

export { expectRejection };
