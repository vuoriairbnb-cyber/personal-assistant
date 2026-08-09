"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import { Search, ExternalLink, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { parseGolfQuery, toSearchParams } from "@/lib/golf/parse-query";
import type { GolfSearchResult } from "@/lib/golf/types";

const BOOKING_URL = "https://app.wisegolf.fi/#/golf/reservation/7";

const QUICK_QUERIES = [
  "Huomenna",
  "Huomenna illalla",
  "Ensi lauantaina",
  "Ensi sunnuntaina aamupäivällä",
  "Tänä iltana",
];

interface ErrorBody {
  error?: string;
}

export function GolfSearch() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<GolfSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(query: string) {
    setLoading(true);
    setError(null);

    try {
      const parsed = parseGolfQuery(query);
      const params = toSearchParams(parsed);
      const response = await fetch(`/api/golf?${params.toString()}`);
      const body = (await response.json()) as GolfSearchResult | { results: GolfSearchResult[] } | ErrorBody;

      if (!response.ok) {
        throw new Error(("error" in body && body.error) || "Haku epäonnistui.");
      }

      setResults("results" in body ? body.results : [body as GolfSearchResult]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Haku epäonnistui.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function handleQuick(query: string) {
    setText(query);
    void runSearch(query);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    void runSearch(text.trim());
  }

  const totalFree = results?.reduce((sum, day) => sum + day.vapaat.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="esim. ensi keskiviikkona illalla"
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !text.trim()}>
          <Search size={16} strokeWidth={1.75} />
          {loading ? "Haetaan…" : "Hae"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {QUICK_QUERIES.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => handleQuick(query)}
            disabled={loading}
            className="rounded-full border border-border-default bg-card px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-150 hover:bg-sand-200 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {query}
          </button>
        ))}
      </div>

      {error && (
        <Card className="border-danger-strong bg-danger-bg">
          <p className="text-sm text-danger-strong">{error}</p>
        </Card>
      )}

      {results && (
        <div className="space-y-4">
          {results.map((day) => (
            <DayResults key={day.date} day={day} />
          ))}
          {totalFree === 0 && !error && (
            <Card>
              <p className="text-sm text-text-secondary">
                Ei vapaita aikoja haulla. Kokeile toista päivää tai laajempaa aikaikkunaa.
              </p>
            </Card>
          )}
        </div>
      )}

      <a
        href={BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
      >
        Varaa aika WiseGolfissa
        <ExternalLink size={14} strokeWidth={1.75} />
      </a>

      <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <Lock size={12} strokeWidth={1.75} />
        Vain haku — varaus tehdään aina käsin yllä olevasta linkistä.
      </p>
    </div>
  );
}

function DayResults({ day }: { day: GolfSearchResult }) {
  const label = format(new Date(`${day.date}T12:00:00`), "EEEE d.M.", { locale: fi });

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-subtle bg-card-hover px-4 py-2.5">
        <p className="text-sm font-semibold capitalize text-text-primary">{label}</p>
        <p className="text-xs text-text-tertiary">
          {day.yhteensa} {day.yhteensa === 1 ? "vapaa aika" : "vapaata aikaa"}
        </p>
      </div>
      {day.vapaat.length === 0 ? (
        <p className="px-4 py-4 text-sm text-text-secondary">Ei vapaita aikoja tälle päivälle.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4 md:grid-cols-6">
          {day.vapaat.map((slot) => (
            <div
              key={slot.aika}
              className="rounded-md border border-border-default bg-canvas px-2 py-2 text-center"
            >
              <p className="text-sm font-semibold text-text-primary">{slot.aika}</p>
              <p className="text-[11px] text-text-tertiary">
                {slot.vapaita} {slot.vapaita === 1 ? "paikka" : "paikkaa"}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
