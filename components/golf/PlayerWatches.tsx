"use client";

import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { KLUBIT } from "@/lib/golf/clubs";

type Watch = { id: string; player_name: string; courses: string[]; date_from: string; date_to: string; status: "active" | "expired" | "cancelled" | "processing" };
const clubs = KLUBIT.filter((club) => club.playerSearch?.enabled);
const today = () => format(new Date(), "yyyy-MM-dd");

export function PlayerWatches() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(() => format(addDays(new Date(), 6), "yyyy-MM-dd"));
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/golf/player-watches");
      const body = await response.json() as { watches?: Watch[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Pelaajavahtien haku epäonnistui.");
      setWatches(body.watches ?? []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pelaajavahtien haku epäonnistui."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!playerName.trim() || !consent || dateTo < dateFrom) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/golf/player-watches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        player_name: playerName, search_all_supported: true, courses: [], date_from: dateFrom, date_to: dateTo, consent_confirmed: true,
      }) });
      const body = await response.json() as { watch?: Watch; error?: string };
      if (!response.ok || !body.watch) throw new Error(body.error ?? "Pelaajavahdin luonti epäonnistui.");
      setWatches((current) => [body.watch!, ...current]); setPlayerName(""); setConsent(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pelaajavahdin luonti epäonnistui."); }
    finally { setSaving(false); }
  }

  async function cancel(id: string) {
    try {
      const response = await fetch(`/api/golf/player-watches/${id}`, { method: "DELETE" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Pelaajavahdin poisto epäonnistui.");
      setWatches((current) => current.filter((watch) => watch.id !== id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pelaajavahdin poisto epäonnistui."); }
  }

  return <section className="mt-8 border-t border-border-default pt-7">
    <div className="mb-4"><h2 className="font-serif text-2xl text-text-primary">Pelaajavahdit</h2><p className="mt-1 text-sm text-text-secondary">Seuraa vapaaehtoisesti julkistettua pelaajaa tuetuilla kentillä. Tarkistus tehdään 5 minuutin välein.</p></div>
    <form onSubmit={create} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-text-secondary">Pelaajan nimi<Input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Etunimi Sukunimi" className="mt-1" required /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm text-text-secondary">Alkaen<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 h-10 w-full rounded-sm border border-border-default bg-canvas px-3 text-sm" /></label><label className="text-sm text-text-secondary">Päättyen<input type="date" value={dateTo} max={format(addDays(new Date(`${dateFrom}T12:00:00`), 13), "yyyy-MM-dd")} onChange={(event) => setDateTo(event.target.value)} className="mt-1 h-10 w-full rounded-sm border border-border-default bg-canvas px-3 text-sm" /></label></div></div>
      <p className="text-xs text-text-secondary">Haetaan kaikilta tuetuilta kentiltä: {clubs.map((club) => club.nimi).join(", ")}.</p>
      <label className="flex items-start gap-2 text-sm text-text-secondary"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />Vahvistan, että minulla on oikeus seurata tämän henkilön vapaaehtoisesti julkistamia tietoja.</label>
      <Button type="submit" disabled={saving || !playerName.trim() || !consent || dateTo < dateFrom}><Bell size={16} strokeWidth={1.75} />{saving ? "Tallennetaan…" : "Luo pelaajavahti"}</Button>
    </form>
    {error && <Card className="mt-4 border-danger-strong bg-danger-bg"><p className="text-sm text-danger-strong">{error}</p></Card>}
    <div className="mt-5 space-y-2">{loading ? <p className="text-sm text-text-secondary">Ladataan pelaajavahteja…</p> : watches.length ? watches.map((watch) => <Card key={watch.id} className="flex items-center justify-between gap-3"><div><p className="font-medium text-text-primary">{watch.player_name}</p><p className="text-sm text-text-secondary">{watch.date_from}–{watch.date_to} · {watch.status === "active" ? "Aktiivinen" : watch.status === "expired" ? "Päättynyt" : watch.status}</p></div>{watch.status === "active" && <Button type="button" variant="secondary" onClick={() => void cancel(watch.id)} aria-label="Poista pelaajavahti"><Trash2 size={16} /></Button>}</Card>) : <Card><p className="text-sm text-text-secondary">Ei pelaajavahteja.</p></Card>}</div>
  </section>;
}
