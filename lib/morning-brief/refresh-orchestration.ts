import type { SourceIngestionSummary } from "./sources/types";

export type RefreshFetchResult = { ok: boolean; error?: string; summary?: { sources: SourceIngestionSummary[]; pending: number } };
export type RefreshBatchResult = { ok: boolean; error?: string; summary?: { processed: number; failed: number; remaining: number; luna: number; lunaAccepted: number; terra: number; embedded: number; errors: string[] } };
export type RefreshRegenerateResult = { ok: boolean; error?: string };
export type RefreshMarketResult = { ok: boolean; error?: string };
export type RefreshActions = { fetch: () => Promise<RefreshFetchResult>; processBatch: () => Promise<RefreshBatchResult>; regenerate: () => Promise<RefreshRegenerateResult>; refreshMarket?: () => Promise<RefreshMarketResult> };
export type RefreshProgress = { phase: "fetching" | "processing" | "ranking"; total: number; processed: number; failed: number; remaining: number; sources?: SourceIngestionSummary[] };
export type RefreshResult = { ok: boolean; reason?: "already_running" | "fetch_failed" | "processing_failed" | "regeneration_failed"; error?: string; processed: number; failed: number; sources: SourceIngestionSummary[] };

/** Client-side orchestrator: each server call stays within the existing bounded request budget. */
export function createMorningBriefRefreshRunner(actions: RefreshActions) {
  let running = false;
  return async (onProgress: (progress: RefreshProgress) => void): Promise<RefreshResult> => {
    if (running) return { ok: false, reason: "already_running", processed: 0, failed: 0, sources: [] };
    running = true;
    try {
      onProgress({ phase: "fetching", total: 0, processed: 0, failed: 0, remaining: 0 });
      const [fetched] = await Promise.all([actions.fetch(), actions.refreshMarket ? actions.refreshMarket().catch(() => ({ ok: false })) : Promise.resolve({ ok: true })]);
      if (!fetched.ok || !fetched.summary) return { ok: false, reason: "fetch_failed", error: fetched.error, processed: 0, failed: 0, sources: [] };
      const sources = fetched.summary.sources; const total = fetched.summary.pending; let remaining = total; let processed = 0; let failed = 0;
      while (remaining > 0) {
        onProgress({ phase: "processing", total, processed, failed, remaining, sources });
        const batch = await actions.processBatch();
        if (!batch.ok || !batch.summary) return { ok: false, reason: "processing_failed", error: batch.error, processed, failed, sources };
        processed += batch.summary.processed; failed += batch.summary.failed; remaining = batch.summary.remaining;
        // A failed or permanently non-progressing batch must never spin indefinitely or regenerate a partial brief.
        if (remaining > 0 && batch.summary.processed === 0) return { ok: false, reason: "processing_failed", error: batch.summary.errors[0] ?? "Article processing stopped before all work completed.", processed, failed, sources };
      }
      onProgress({ phase: "ranking", total, processed, failed, remaining: 0, sources });
      const regenerated = await actions.regenerate();
      if (!regenerated.ok) return { ok: false, reason: "regeneration_failed", error: regenerated.error, processed, failed, sources };
      return { ok: true, processed, failed, sources };
    } finally { running = false; }
  };
}
