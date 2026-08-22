"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { fi } from "date-fns/locale";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { KLUBIT } from "@/lib/golf/clubs";
import { PlayerWatches } from "./PlayerWatches";

type Range = "today" | "7" | "14" | "30" | "custom";
type Result = { clubId: string; clubName: string; courseId: string; courseName: string; date: string; time: string; dateTimeStart: string };
const PLAYER_CLUBS = KLUBIT.filter((club) => club.playerSearch?.enabled);
const isoToday = () => format(new Date(), "yyyy-MM-dd");

export function PlayerSearch() {
  const [firstName, setFirstName] = useState(""); const [familyName, setFamilyName] = useState("");
  const [clubs, setClubs] = useState<Set<string>>(() => new Set(PLAYER_CLUBS.map((club) => club.id)));
  const [range, setRange] = useState<Range>("7"); const [dateFrom, setDateFrom] = useState(isoToday); const [dateTo, setDateTo] = useState(() => format(addDays(new Date(), 6), "yyyy-MM-dd"));
  const [results, setResults] = useState<Result[] | null>(null); const [partial, setPartial] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const dateRange = useMemo(() => range === "custom" ? { dateFrom, dateTo } : { dateFrom: isoToday(), dateTo: format(addDays(new Date(), range === "today" ? 0 : Number(range) - 1), "yyyy-MM-dd") }, [range, dateFrom, dateTo]);
  const valid = firstName.trim() && familyName.trim() && clubs.size && dateRange.dateTo >= dateRange.dateFrom && dateRange.dateTo <= format(addDays(new Date(`${dateRange.dateFrom}T12:00:00`), 30), "yyyy-MM-dd");
  function toggleClub(id: string) { setClubs((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!valid) return; setLoading(true); setError(null); setResults(null); try { const response = await fetch("/api/golf/players/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName, familyName, clubs: [...clubs], ...dateRange }) }); const body = await response.json() as { results?: Result[]; partialFailures?: unknown[]; error?: string }; if (!response.ok) throw new Error(body.error === "WISEGOLF_AUTH_REQUIRED" ? "WiseGolf-yhteys täytyy päivittää ennen pelaajahakua." : body.error ?? "Haku epäonnistui."); setResults(body.results ?? []); setPartial(Boolean(body.partialFailures?.length)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Haku epäonnistui."); } finally { setLoading(false); } }
  return <div><form onSubmit={submit} className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-text-secondary">Etunimi<Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1" /></label><label className="text-sm text-text-secondary">Sukunimi<Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} required className="mt-1" /></label></div>
    <div><p className="mb-2 text-xs font-semibold text-text-secondary">Kentät</p><div className="flex flex-wrap gap-2">{PLAYER_CLUBS.map((club) => <label key={club.id} className="flex items-center gap-2 rounded-md border border-border-default bg-card px-3 py-2 text-sm text-text-secondary"><input type="checkbox" checked={clubs.has(club.id)} onChange={() => toggleClub(club.id)} />{club.nimi}</label>)}</div></div>
    <div><p className="mb-2 text-xs font-semibold text-text-secondary">Ajanjakso</p><div className="flex flex-wrap gap-2">{(["today", "7", "14", "30", "custom"] as Range[]).map((value) => <button key={value} type="button" onClick={() => setRange(value)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${range === value ? "border-accent bg-accent text-white" : "border-border-default bg-card text-text-secondary"}`}>{({ today: "Tänään", "7": "7 päivää", "14": "14 päivää", "30": "30 päivää", custom: "Oma ajanjakso" })[value]}</button>)}</div>{range === "custom" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm text-text-secondary">Alkaen<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 block h-10 rounded-sm border border-border-default bg-canvas px-3 text-sm" /></label><label className="text-sm text-text-secondary">Päättyen<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 block h-10 rounded-sm border border-border-default bg-canvas px-3 text-sm" /></label></div>}</div>
    <Button type="submit" disabled={!valid || loading}><Search size={16} strokeWidth={1.75} />{loading ? "Haetaan…" : "Hae lähdöt"}</Button>
    {error && <Card className="border-danger-strong bg-danger-bg"><p className="text-sm text-danger-strong">{error}</p></Card>}
    {partial && <Card><p className="text-sm text-text-secondary">Kaikkia kenttiä tai päiviä ei voitu tarkistaa.</p></Card>}
    {results && <div className="space-y-3">{results.length ? <><p className="text-sm font-medium text-text-primary">{firstName.trim()} {familyName.trim()}</p>{results.map((result) => <Card key={`${result.clubId}:${result.courseId}:${result.dateTimeStart}`} className="flex items-center justify-between"><div><p className="font-medium text-text-primary">{format(new Date(`${result.date}T12:00:00`), "EEE d.M.", { locale: fi }).toUpperCase()}</p><p className="text-sm text-text-secondary">{result.clubName}{result.courseName !== result.clubName ? ` · ${result.courseName}` : ""}</p></div><p className="font-serif text-xl text-text-primary">{result.time}</p></Card>)}</> : <Card><p className="text-sm text-text-secondary">Ei lähtöjä valitulla ajanjaksolla.</p></Card>}</div>}
  </form><PlayerWatches /></div>;
}
