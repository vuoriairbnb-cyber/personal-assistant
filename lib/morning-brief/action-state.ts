import type { SourceIngestionSummary } from "./sources/types";

export async function runWithLoading<T>(setLoading: (value: boolean) => void, action: () => Promise<T>) {
  setLoading(true); try { return await action(); } finally { setLoading(false); }
}

export function formatIngestionSummary(sources: SourceIngestionSummary[]) {
  const details = sources.map((source) => source.error ? `${source.source}: ${source.error}` : `${source.source}: ${source.fetched} fetched, ${source.new} new, ${source.duplicates} duplicates`).join(" · ");
  return sources.some((source) => source.failed > 0) ? `Live source fetch partially failed. ${details}` : details;
}
