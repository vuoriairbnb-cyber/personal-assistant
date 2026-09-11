"use client";
import { useState } from "react";
import { fetchLiveMorningBriefSources, regenerateMockMorningBrief } from "@/lib/actions/morning-brief";
import { formatIngestionSummary, runWithLoading } from "@/lib/morning-brief/action-state";

export function MockBriefGenerator() {
  const [pending, setPending] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const regenerate = async () => { const result = await runWithLoading(setPending, regenerateMockMorningBrief); if (result.ok) window.location.reload(); else setMessage(result.error ?? "Could not regenerate the Morning Brief."); };
  const fetchSources = async () => { try { const result = await runWithLoading(setPending, fetchLiveMorningBriefSources); setMessage(result.ok && result.summary ? formatIngestionSummary(result.summary.sources) : result.error ?? "Live source fetch failed."); } catch { setMessage("Live source fetch failed. Please try again."); } };
  return <div className="flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={regenerate} disabled={pending} className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary">{pending ? "Working…" : "Regenerate Morning Brief"}</button><button type="button" onClick={fetchSources} disabled={pending} className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary">{pending ? "Working…" : "Fetch live open sources"}</button>{message && <span role="status" className="basis-full text-right text-xs text-text-secondary">{message}</span>}</div>;
}
