export async function mapWithConcurrency<Item extends NonNullable<unknown>, Result>(
  items: readonly Item[],
  concurrency: number,
  mapItem: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }

  const results: Result[] = [];
  const itemsWithIndices = items.entries();
  const runWorker = async (): Promise<void> => {
    const nextItem = itemsWithIndices.next();
    if (nextItem.done === true) {
      return;
    }

    const [index, item] = nextItem.value;
    results[index] = await mapItem(item);
    await runWorker();
  };
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    runWorker,
  );
  await Promise.all(workers);
  return results;
}
