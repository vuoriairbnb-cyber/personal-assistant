"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export type WatchSearch = { courses: string[]; date: string; timeFrom: string | null; timeTo: string | null; players: number };
type GolfWatch = {
  id: string; courses: string[]; date: string; time_from: string | null; time_to: string | null; players: number;
  status: "active" | "processing" | "matched" | "expired" | "cancelled";
  last_checked_at: string | null; matched_at: string | null; matched_course: string | null;
  matched_time: string | null; matched_available_spots: number | null;
};

const dateTime = new Intl.DateTimeFormat("fi-FI", { timeZone: "Europe/Helsinki", dateStyle: "short", timeStyle: "short" });
function courseLabel(courses: string[]) { return courses.map((course) => course.split(":")[1] ?? course).join(", "); }
function watchLabel(watch: GolfWatch) {
  const time = watch.time_from && watch.time_to ? `${watch.time_from}–${watch.time_to}` : watch.time_from ? `klo ${watch.time_from} jälkeen` : watch.time_to ? `ennen klo ${watch.time_to}` : "koko päivä";
  return `${watch.date} · ${time} · ${watch.players} pelaajaa`;
}

export function GolfWatches({ watchSearch }: { watchSearch: WatchSearch | null }) {
  const [watches, setWatches] = useState<GolfWatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/golf/watches");
      const body = await response.json() as { watches?: GolfWatch[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Vahtien haku epäonnistui.");
      setWatches(body.watches ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Vahtien haku epäonnistui."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function createWatch() {
    if (!watchSearch) return;
    setCreating(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/golf/watches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        courses: watchSearch.courses, date: watchSearch.date, time_from: watchSearch.timeFrom,
        time_to: watchSearch.timeTo, players: watchSearch.players,
      }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Vahdin luonti epäonnistui.");
      setMessage("Golf-vahti aktivoitu. Tarkistan saatavuuden 5 minuutin välein.");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Vahdin luonti epäonnistui."); }
    finally { setCreating(false); }
  }

  async function cancelWatch(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/golf/watches/${id}`, { method: "DELETE" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Vahdin poisto epäonnistui.");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Vahdin poisto epäonnistui."); }
  }

  return <section className="space-y-3 border-t border-border-default pt-5">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-serif text-xl text-text-primary">Golf-vahdit</h2><p className="text-sm text-text-secondary">Tallennetut haut tarkistetaan 5 minuutin välein.</p></div>
      <Button type="button" variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} /> Päivitä</Button>
    </div>
    {watchSearch && <Button type="button" onClick={() => void createWatch()} disabled={creating}><Bell size={16} />{creating ? "Aktivoidaan…" : "Vahdi tätä hakua"}</Button>}
    {message && <Card className="border-success-strong bg-success-bg"><p className="text-sm text-success-strong">{message}</p></Card>}
    {error && <Card className="border-danger-strong bg-danger-bg"><p className="text-sm text-danger-strong">{error}</p></Card>}
    {!loading && watches.length === 0 && <Card><p className="text-sm text-text-secondary">Ei aktiivisia tai osuneita golf-vahteja.</p></Card>}
    <div className="space-y-2">
      {watches.map((watch) => <Card key={watch.id} className={watch.status === "matched" ? "border-accent bg-accent/5" : undefined}>
        {watch.status === "matched" ? <div className="space-y-1"><p className="font-medium text-text-primary">🔔 Aika löytyi</p><p className="text-sm text-text-secondary">{watch.matched_course} · {watch.matched_time} · {watch.matched_available_spots} paikkaa vapaana</p><p className="text-xs text-text-tertiary">Löytyi: {watch.matched_at ? dateTime.format(new Date(watch.matched_at)) : "—"}</p></div>
          : <div className="flex items-start justify-between gap-3"><div><p className="font-medium text-text-primary">{courseLabel(watch.courses)}</p><p className="text-sm text-text-secondary">{watchLabel(watch)}</p><p className="mt-1 text-xs text-text-tertiary">{watch.status === "active" || watch.status === "processing" ? "🟢 Aktiivinen" : "Vanhentunut"} · {watch.last_checked_at ? `Tarkistettu: ${dateTime.format(new Date(watch.last_checked_at))}` : "Ei vielä tarkistettu"}</p></div>
          {watch.status === "active" && <Button type="button" variant="ghost" size="sm" onClick={() => void cancelWatch(watch.id)} aria-label="Poista vahti"><Trash2 size={15} /> Poista</Button>}</div>}
      </Card>)}
    </div>
  </section>;
}
