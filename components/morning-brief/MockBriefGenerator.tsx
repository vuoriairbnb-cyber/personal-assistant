"use client";

import { useState } from "react";
import { fetchLiveMorningBriefSources, processMorningBriefPendingBatchAction, regenerateMockMorningBrief } from "@/lib/actions/morning-brief";
import { formatIngestionSummary } from "@/lib/morning-brief/action-state";
import { canRegenerateMorningBrief } from "@/lib/morning-brief/pending-pipeline";

type ProcessingProgress = { total: number; processed: number; failed: number; remaining: number; luna: number; lunaAccepted: number; terra: number; embedded: number };

export function MockBriefGenerator() {
  const [fetching, setFetching] = useState(false); const [processing, setProcessing] = useState(false); const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null); const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const canRegenerate = canRegenerateMorningBrief({ fetching, processing }) && !regenerating;

  const processPending = async (initialPending: number) => {
    setProcessing(true); setProgress((current) => current ?? { total: initialPending, processed: 0, failed: 0, remaining: initialPending, luna: 0, lunaAccepted: 0, terra: 0, embedded: 0 });
    try {
      let remaining = initialPending;
      while (remaining > 0) {
        const result = await processMorningBriefPendingBatchAction();
        if (!result.ok || !result.summary) { setMessage(result.error ?? "Could not process the next Morning Brief batch."); return; }
        const batch = result.summary; remaining = batch.remaining;
        setProgress((current) => ({ total: current?.total ?? initialPending, processed: (current?.processed ?? 0) + batch.processed, failed: (current?.failed ?? 0) + batch.failed, remaining: batch.remaining, luna: (current?.luna ?? 0) + batch.luna, lunaAccepted: (current?.lunaAccepted ?? 0) + batch.lunaAccepted, terra: (current?.terra ?? 0) + batch.terra, embedded: (current?.embedded ?? 0) + batch.embedded }));
        if (remaining > 0 && batch.processed === 0) { setMessage(batch.errors[0] ?? "Some articles could not be processed. Resume processing to try again."); return; }
      }
      setMessage("Live article processing complete. You can now regenerate Morning Brief.");
    } catch { setMessage("Could not process the next Morning Brief batch."); } finally { setProcessing(false); }
  };

  const fetchSources = async () => {
    setFetching(true); setMessage(null); setProgress(null);
    let pending = 0;
    try {
      const result = await fetchLiveMorningBriefSources();
      if (!result.ok || !result.summary) { setMessage(result.error ?? "Live source fetch failed."); return; }
      setMessage(`${formatIngestionSummary(result.summary.sources)}${result.summary.pending ? ` · ${result.summary.pending} pending AI articles.` : ""}`);
      pending = result.summary.pending;
    } catch { setMessage("Live source fetch failed. Please try again."); } finally { setFetching(false); }
    if (pending) await processPending(pending);
  };

  const regenerate = async () => {
    setRegenerating(true); setMessage(null);
    try { const result = await regenerateMockMorningBrief(); if (result.ok) window.location.reload(); else setMessage(result.error ?? "Could not regenerate the Morning Brief."); } catch { setMessage("Could not regenerate the Morning Brief."); } finally { setRegenerating(false); }
  };

  const resume = async () => { if (progress?.remaining) await processPending(progress.remaining); };
  return <div className="flex flex-wrap items-center justify-end gap-2">
    <button type="button" onClick={regenerate} disabled={!canRegenerate} className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary">{regenerating ? "Regenerating…" : "Regenerate Morning Brief"}</button>
    <button type="button" onClick={fetchSources} disabled={fetching || processing || regenerating} className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary">{fetching ? "Fetching sources…" : "Fetch live open sources"}</button>
    {progress?.remaining ? <button type="button" onClick={resume} disabled={fetching || processing || regenerating} className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary">{processing ? `Processing ${progress.processed} / ${progress.total}…` : "Resume processing"}</button> : null}
    {progress && <span role="status" className="basis-full text-right text-xs text-text-secondary">AI processing: {progress.processed} processed, {progress.remaining} remaining · Luna {progress.luna} ({progress.lunaAccepted} accepted), Terra {progress.terra} ({progress.luna ? Math.round((progress.terra / progress.luna) * 100) : 0}%) · Embeddings {progress.embedded} · Failed {progress.failed}</span>}
    {message && <span role="status" className="basis-full text-right text-xs text-text-secondary">{message}</span>}
  </div>;
}
