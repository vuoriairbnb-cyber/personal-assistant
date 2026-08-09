"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ClubDayResult } from "@/lib/golf/types";

function statusMessage(result: ClubDayResult): string {
  switch (result.status) {
    case "kausi_kiinni":
      return "Kausi ei ole tälle päivälle auki.";
    case "liian_kaukana":
      return `Kalenteri näyttää vain ${result.horisonttiPaivia} päivää eteenpäin.`;
    case "virhe":
      return "Haku epäonnistui tälle klubille.";
    case "ok":
      return result.vapaat.length === 0 ? "Ei vapaita aikoja." : `${result.vapaat.length} vapaata aikaa`;
  }
}

/** One club's collapsible result section for one day. Defaults open. */
export function ClubResultSection({ result }: { result: ClubDayResult }) {
  const [open, setOpen] = useState(true);
  const isOk = result.status === "ok";

  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-text-primary">{result.nimi}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-tertiary">
          {statusMessage(result)}
          {open ? <ChevronUp size={14} strokeWidth={1.75} /> : <ChevronDown size={14} strokeWidth={1.75} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-border-subtle">
          {!isOk ? (
            <p className="px-4 py-3 text-sm text-text-secondary">{statusMessage(result)}</p>
          ) : result.vapaat.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">Ei vapaita aikoja.</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {result.vapaat.map((slot) => (
                <li
                  key={slot.aika}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span className="font-medium text-text-primary">{slot.aika}</span>
                  <span className="text-text-tertiary">
                    {slot.vapaita} {slot.vapaita === 1 ? "paikka" : "paikkaa"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
