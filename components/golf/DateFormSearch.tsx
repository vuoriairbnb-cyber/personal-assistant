"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { fi } from "date-fns/locale";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { SegmentedControl } from "@/components/golf/SegmentedControl";
import type { GolfSearchResult } from "@/lib/golf/types";

const PLAYER_COUNTS = [1, 2, 3, 4] as const;
const DAY_COUNT = 14;

type TimeMode = "all" | "after" | "before" | "between";

const TIME_MODE_OPTIONS: { value: TimeMode; label: string }[] = [
  { value: "all", label: "Koko päivä" },
  { value: "after", label: "Jälkeen" },
  { value: "before", label: "Ennen" },
  { value: "between", label: "Väliltä" },
];

const TIME_INPUT_CLASSES =
  "h-9 rounded-sm border border-border-default bg-canvas px-2 text-sm text-text-primary outline-none focus-visible:border-accent";

export function DateFormSearch({
  onSearching,
  onResults,
  onError,
}: {
  onSearching: () => void;
  onResults: (results: GolfSearchResult[]) => void;
  onError: (message: string) => void;
}) {
  const [players, setPlayers] = useState<number>(1);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [timeMode, setTimeMode] = useState<TimeMode>("all");
  const [afterTime, setAfterTime] = useState("15:00");
  const [beforeTime, setBeforeTime] = useState("18:00");
  const [rangeFrom, setRangeFrom] = useState("09:00");
  const [rangeTo, setRangeTo] = useState("18:00");
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => new Date(), []);
  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, i) => addDays(today, i)),
    [today]
  );

  const rangeInvalid = timeMode === "between" && rangeTo <= rangeFrom;
  const canSearch = selectedDates.size > 0 && !rangeInvalid && !submitting;

  function toggleDate(dateKey: string) {
    setSelectedDates((current) => {
      const next = new Set(current);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  async function handleSearch() {
    if (!canSearch) return;

    setSubmitting(true);
    onSearching();

    const params: Record<string, string> = { min: String(players) };
    if (timeMode === "after") params.after = afterTime;
    else if (timeMode === "before") params.before = beforeTime;
    else if (timeMode === "between") {
      params.after = rangeFrom;
      params.before = rangeTo;
    }

    try {
      const dates = Array.from(selectedDates).sort();
      const results = await Promise.all(
        dates.map(async (date) => {
          const search = new URLSearchParams({ date, ...params });
          const response = await fetch(`/api/golf?${search.toString()}`);
          const body = (await response.json()) as GolfSearchResult | { error?: string };
          if (!response.ok) {
            throw new Error(("error" in body && body.error) || `Haku epäonnistui (${date}).`);
          }
          return body as GolfSearchResult;
        })
      );
      onResults(results);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Haku epäonnistui.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold text-text-secondary">Pelaajamäärä</p>
        <div className="inline-flex gap-1.5">
          {PLAYER_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={players === count}
              onClick={() => setPlayers(count)}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border text-sm font-semibold transition-colors duration-150",
                players === count
                  ? "border-accent bg-accent text-white"
                  : "border-border-default bg-card text-text-secondary hover:bg-sand-200 hover:text-text-primary"
              )}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-text-secondary">
          Päivät ({selectedDates.size} valittu)
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const isSelected = selectedDates.has(key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleDate(key)}
                className={cn(
                  "flex flex-col items-center rounded-md border px-1 py-1.5 text-center transition-colors duration-150",
                  isSelected
                    ? "border-accent bg-accent text-white"
                    : "border-border-default bg-card text-text-secondary hover:bg-sand-200 hover:text-text-primary"
                )}
              >
                <span className="text-[10px] font-medium uppercase capitalize opacity-80">
                  {format(day, "EEEEEE", { locale: fi })}
                </span>
                <span className="text-[13px] font-semibold">{format(day, "d.M.")}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-text-secondary">Kellonaika</p>
        <SegmentedControl
          label="Kellonaikarajaus"
          value={timeMode}
          onChange={setTimeMode}
          options={TIME_MODE_OPTIONS}
        />

        {timeMode === "after" && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-sm text-text-secondary">klo</span>
            <input
              type="time"
              value={afterTime}
              onChange={(event) => setAfterTime(event.target.value)}
              className={TIME_INPUT_CLASSES}
            />
            <span className="text-sm text-text-secondary">jälkeen</span>
          </div>
        )}

        {timeMode === "before" && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-sm text-text-secondary">klo</span>
            <input
              type="time"
              value={beforeTime}
              onChange={(event) => setBeforeTime(event.target.value)}
              className={TIME_INPUT_CLASSES}
            />
            <span className="text-sm text-text-secondary">ennen</span>
          </div>
        )}

        {timeMode === "between" && (
          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={rangeFrom}
                onChange={(event) => setRangeFrom(event.target.value)}
                className={TIME_INPUT_CLASSES}
              />
              <span className="text-sm text-text-secondary">–</span>
              <input
                type="time"
                value={rangeTo}
                onChange={(event) => setRangeTo(event.target.value)}
                className={TIME_INPUT_CLASSES}
              />
            </div>
            {rangeInvalid && (
              <p className="text-xs text-danger-strong">
                Loppuaika ei voi olla ennen alkuaikaa (tai sama).
              </p>
            )}
          </div>
        )}
      </div>

      <Button type="button" onClick={handleSearch} disabled={!canSearch}>
        <Search size={16} strokeWidth={1.75} />
        {submitting ? "Haetaan…" : "Hae"}
      </Button>
    </div>
  );
}
