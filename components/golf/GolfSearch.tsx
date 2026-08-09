"use client";

import { useState } from "react";
import { Search, ExternalLink, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/golf/SegmentedControl";
import { DateFormSearch } from "@/components/golf/DateFormSearch";
import { DayResults } from "@/components/golf/DayResults";
import { parseGolfQuery, toSearchParams } from "@/lib/golf/parse-query";
import { KLUBIT, DEFAULT_CLUB_ID, detectClub, getClub } from "@/lib/golf/clubs";
import type { GolfSearchResult } from "@/lib/golf/types";

const QUICK_QUERIES = [
  "Huomenna",
  "Huomenna illalla",
  "Ensi lauantaina",
  "Ensi sunnuntaina aamupäivällä",
  "Tänä iltana",
];

type Mode = "text" | "form";

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "text", label: "Kirjoita" },
  { value: "form", label: "Valitse" },
];

interface ErrorBody {
  error?: string;
}

export function GolfSearch() {
  const [mode, setMode] = useState<Mode>("text");
  const [clubId, setClubId] = useState(DEFAULT_CLUB_ID);
  const [text, setText] = useState("");
  const [results, setResults] = useState<GolfSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeClub = getClub(clubId) ?? KLUBIT[0]!;

  async function runTextSearch(query: string) {
    setLoading(true);
    setError(null);

    // A club named in the text wins for this search and becomes the new
    // dropdown selection too, so a follow-up quick-query button uses it.
    const detected = detectClub(query);
    const searchClubId = detected?.id ?? clubId;
    if (detected && detected.id !== clubId) setClubId(detected.id);

    try {
      const parsed = parseGolfQuery(query);
      const params = toSearchParams(parsed);
      params.set("club", searchClubId);
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
    void runTextSearch(query);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    void runTextSearch(text.trim());
  }

  function handleFormResults(formResults: GolfSearchResult[]) {
    setResults(formResults);
    setLoading(false);
    setError(null);
  }

  function handleFormError(message: string) {
    setError(message);
    setResults(null);
    setLoading(false);
  }

  const totalFree = results?.reduce((sum, day) => sum + day.vapaat.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <label className="mb-1.5 block text-xs font-semibold text-text-secondary" htmlFor="golf-club">
          Klubi
        </label>
        <Select
          id="golf-club"
          value={clubId}
          onChange={(event) => setClubId(event.target.value)}
        >
          {KLUBIT.map((club) => (
            <option key={club.id} value={club.id}>
              {club.nimi}
            </option>
          ))}
        </Select>
      </div>

      <SegmentedControl label="Hakutapa" value={mode} onChange={setMode} options={MODE_OPTIONS} />

      {mode === "text" ? (
        <div className="space-y-3">
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
        </div>
      ) : (
        <DateFormSearch
          clubId={clubId}
          onSearching={() => {
            setLoading(true);
            setError(null);
          }}
          onResults={handleFormResults}
          onError={handleFormError}
        />
      )}

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
        href={activeClub.bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
      >
        Varaa aika WiseGolfissa ({activeClub.nimi})
        <ExternalLink size={14} strokeWidth={1.75} />
      </a>

      <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <Lock size={12} strokeWidth={1.75} />
        Vain haku — varaus tehdään aina käsin yllä olevasta linkistä.
      </p>
    </div>
  );
}
