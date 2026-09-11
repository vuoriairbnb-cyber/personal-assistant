export async function mapBounded<T, R>(items: readonly T[], concurrency: number, worker: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length); let cursor = 0;
  const run = async () => { for (;;) { const index = cursor; cursor += 1; if (index >= items.length) return; results[index] = await worker(items[index]!, index); } };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, run)); return results;
}

export function limitCandidates<T>(items: readonly T[], limit: number) { return items.slice(0, Math.max(0, limit)); }
