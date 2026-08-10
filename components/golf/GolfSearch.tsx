"use client";

import { useState } from "react";
import { Search, ExternalLink, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/golf/SegmentedControl";
import { ClubMultiSelect } from "@/components/golf/ClubMultiSelect";
import { CourseMultiSelect } from "@/components/golf/CourseMultiSelect";
import { DateFormSearch } from "@/components/golf/DateFormSearch";
import { DayGroupResults } from "@/components/golf/DayGroupResults";
import { parseGolfQuery, toSearchParams } from "@/lib/golf/parse-query";
import { KLUBIT, DEFAULT_CLUB_ID, detectClub, detectCourse, getClub } from "@/lib/golf/clubs";
import type { DayGroup } from "@/lib/golf/types";

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
  const [selectedClubs, setSelectedClubs] = useState<Set<string>>(new Set([DEFAULT_CLUB_ID]));
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [results, setResults] = useState<DayGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runTextSearch(query: string) {
    setLoading(true);
    setError(null);

    // A club named in the text wins for this search and replaces the chip
    // selection too, so a follow-up quick-query button uses it.
    const detectedClub = detectClub(query);
    // A globally unambiguous course alias (e.g. "Forest") is enough to
    // select its parent club; within an explicitly named club we only inspect
    // that club's own courses.
    const detectedCourse = detectCourse(query, detectedClub);
    const courseClub = detectedCourse?.club;
    const searchClubs = detectedClub || courseClub ? new Set([(detectedClub ?? courseClub)!.id]) : selectedClubs;
    if (detectedClub || courseClub) {
      setSelectedClubs(searchClubs);
      setSelectedCourses(() => {
        if (detectedCourse) {
          return new Set([`${detectedCourse.club.id}:${detectedCourse.course.id}`]);
        }
        const club = detectedClub ?? courseClub!;
        return new Set(
          club.kentat.length > 1 ? club.kentat.map((course) => `${club.id}:${course.id}`) : []
        );
      });
    }

    try {
      const parsed = parseGolfQuery(query);
      const params = toSearchParams(parsed);
      params.set("club", Array.from(searchClubs).join(","));
      if (detectedCourse) {
        params.set("course", `${detectedCourse.club.id}:${detectedCourse.course.id}`);
      } else {
        const courses = Array.from(selectedCourses).filter((entry) =>
          searchClubs.has(entry.split(":")[0] ?? "")
        );
        if (courses.length > 0) params.set("course", courses.join(","));
      }
      const response = await fetch(`/api/golf?${params.toString()}`);
      const body = (await response.json()) as { results: DayGroup[] } | ErrorBody;

      if (!response.ok) {
        throw new Error(("error" in body && body.error) || "Haku epäonnistui.");
      }

      setResults("results" in body ? body.results : []);
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

  function handleFormResults(formResults: DayGroup[]) {
    setResults(formResults);
    setLoading(false);
    setError(null);
  }

  function handleFormError(message: string) {
    setError(message);
    setResults(null);
    setLoading(false);
  }

  function handleClubsChange(next: Set<string>) {
    setSelectedClubs(next);
    setSelectedCourses((current) => {
      const courses = new Set(
        Array.from(current).filter((entry) => next.has(entry.split(":")[0] ?? ""))
      );
      // Selecting a multi-course club starts with all of its courses, so the
      // default remains the same as an unrestricted club search.
      for (const club of KLUBIT) {
        if (next.has(club.id) && !selectedClubs.has(club.id) && club.kentat.length > 1) {
          club.kentat.forEach((course) => courses.add(`${club.id}:${course.id}`));
        }
      }
      return courses;
    });
  }

  const totalFree =
    results?.reduce(
      (sum, group) =>
        sum +
        group.clubs.reduce(
          (clubSum, club) => clubSum + (club.status === "ok" ? club.vapaat.length : 0),
          0
        ),
      0
    ) ?? 0;

  const activeClubs = Array.from(selectedClubs)
    .map((id) => getClub(id))
    .filter((club): club is NonNullable<typeof club> => Boolean(club));

  return (
    <div className="space-y-6">
      <ClubMultiSelect selected={selectedClubs} onChange={handleClubsChange} />
      <CourseMultiSelect
        selectedClubs={selectedClubs}
        selectedCourses={selectedCourses}
        onChange={setSelectedCourses}
      />

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
          selectedClubs={selectedClubs}
          selectedCourses={selectedCourses}
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
          {results.map((group) => (
            <DayGroupResults key={group.date} group={group} />
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

      <div className="flex flex-col gap-1.5">
        {(activeClubs.length > 0 ? activeClubs : KLUBIT.slice(0, 1)).map((club) => (
          <a
            key={club.id}
            href={club.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
          >
            Varaa aika — {club.nimi}
            <ExternalLink size={14} strokeWidth={1.75} />
          </a>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <Lock size={12} strokeWidth={1.75} />
        Vain haku — varaus tehdään aina käsin yllä olevista linkeistä.
      </p>
    </div>
  );
}
