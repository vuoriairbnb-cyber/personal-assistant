"use client";

import { useRef, useState } from "react";
import { fetchLiveMorningBriefSources, processMorningBriefPendingBatchAction, regenerateMorningBrief } from "@/lib/actions/morning-brief";
import { formatIngestionSummary } from "@/lib/morning-brief/action-state";
import { createMorningBriefRefreshRunner, type RefreshProgress } from "@/lib/morning-brief/refresh-orchestration";

export function MockBriefGenerator() {
  const [running, setRunning] = useState(false); const [message, setMessage] = useState<string | null>(null); const [progress, setProgress] = useState<RefreshProgress | null>(null);
  const runner = useRef(createMorningBriefRefreshRunner({ fetch: fetchLiveMorningBriefSources, processBatch: processMorningBriefPendingBatchAction, regenerate: regenerateMorningBrief })).current;

  const refresh = async () => {
    setRunning(true); setMessage(null);
    try {
      const result = await runner(setProgress);
      if (!result.ok) { if (result.reason !== "already_running") setMessage(result.error ?? "Morning Brief refresh stopped. You can safely try again."); return; }
      setMessage(`Morning Brief updated just now · ${result.sources.length} sources checked · ${result.processed} articles processed${result.failed ? ` · ${result.failed} failed` : ""}`);
      window.location.reload();
    } catch { setMessage("Could not refresh Morning Brief. You can safely try again."); } finally { setRunning(false); }
  };

  const label = !running ? "Refresh Morning Brief" : progress?.phase === "fetching" ? "Fetching sources…" : progress?.phase === "processing" ? `Processing articles ${progress.processed} / ${progress.total}…` : "Ranking stories…";
  return <div className="flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={refresh} disabled={running} className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-white disabled:opacity-60">{label}</button>{progress?.sources && <span role="status" className="basis-full text-right text-xs text-text-secondary">{formatIngestionSummary(progress.sources)}</span>}{message && <span role="status" className="basis-full text-right text-xs text-text-secondary">{message}</span>}</div>;
}
