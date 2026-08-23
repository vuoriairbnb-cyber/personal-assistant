"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { inspectKideEvent } from "@/lib/actions/kide";
import type { KideEvent, KideReservationResult, KideVariant } from "@/lib/kide/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { KideEventSummary } from "./KideEventSummary";
import { KideReservationDialog } from "./KideReservationDialog";
import { KideReservationResultCard } from "./KideReservationResult";

export function KideEventInspector({ configured }: { configured: boolean }) {
  const [input, setInput] = useState(""); const [event, setEvent] = useState<KideEvent | null>(null); const [error, setError] = useState<string | null>(null); const [selectedVariant, setSelectedVariant] = useState<KideVariant | null>(null); const [reservation, setReservation] = useState<KideReservationResult | null>(null); const [pending, startTransition] = useTransition();
  function submit(form: React.FormEvent) { form.preventDefault(); if (!configured || !input.trim()) return; setError(null); setEvent(null); setSelectedVariant(null); setReservation(null); startTransition(async () => { const result = await inspectKideEvent(input); if (result.ok) setEvent(result.event); else setError(result.error); }); }
  return <div className="space-y-6"><Card><form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-sm text-text-secondary">Kide event URL or ID<Input value={input} onChange={(value) => setInput(value.target.value)} placeholder="https://kide.app/events/..." className="mt-1" disabled={!configured} /></label><Button type="submit" disabled={!configured || !input.trim() || pending}><Search size={16} strokeWidth={1.75} />{pending ? "Loading…" : "Load event"}</Button></form></Card>
    {error && <Card className="border-danger-strong bg-danger-bg"><p className="text-sm text-danger-strong">{error}</p></Card>}{reservation && <KideReservationResultCard reservation={reservation} />}{event && <><KideEventSummary event={event} onReserve={setSelectedVariant} /><KideReservationDialog event={event} variant={selectedVariant} onClose={() => setSelectedVariant(null)} onReserved={setReservation} /></>}
  </div>;
}
