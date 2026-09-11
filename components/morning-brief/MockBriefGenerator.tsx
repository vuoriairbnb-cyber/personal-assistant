"use client";
import { useState, useTransition } from "react";
import { fetchLiveMorningBriefSources, regenerateMockMorningBrief } from "@/lib/actions/morning-brief";

export function MockBriefGenerator() {
  const [pending, startTransition] = useTransition(); const [message, setMessage] = useState<string | null>(null);
  return <div className="flex items-center gap-2"><button type="button" onClick={() => startTransition(async () => { await regenerateMockMorningBrief(); window.location.reload(); })} disabled={pending} className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary">{pending ? "Working…" : "Regenerate Morning Brief"}</button><button type="button" onClick={() => startTransition(async () => { const result = await fetchLiveMorningBriefSources(); setMessage(result.ok && result.summary ? `Fetched ${result.summary.sources.reduce((total, source) => total + source.new, 0)} new live articles.` : result.error ?? "Fetch failed."); })} disabled={pending} className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary">Fetch live open sources</button>{message && <span className="text-xs text-text-secondary">{message}</span>}</div>;
}
