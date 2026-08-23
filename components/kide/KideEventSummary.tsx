import { Card } from "@/components/ui/Card";
import type { KideEvent } from "@/lib/kide/types";
import { KideVariantList } from "./KideVariantList";

function formatDate(value: string | null) { if (!value) return "Not available"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fi-FI", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function salesStatus(event: KideEvent) { if (event.salesEnded) return "Sales ended"; if (event.salesPaused) return "Sales paused"; if (event.salesOngoing) return "On sale"; if (!event.salesStarted) return "Waiting for sale"; return "Not currently on sale"; }

export function KideEventSummary({ event }: { event: KideEvent }) {
  const presale = !event.salesStarted && event.variants.length === 0;
  return <div className="space-y-4"><Card><p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Kide event</p><h2 className="mt-2 font-serif text-2xl text-text-primary">{event.name}</h2><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-text-tertiary">Sale start</dt><dd className="mt-1 text-text-primary">{formatDate(event.dateSalesFrom)}</dd></div><div><dt className="text-text-tertiary">Sale end</dt><dd className="mt-1 text-text-primary">{formatDate(event.dateSalesUntil)}</dd></div><div><dt className="text-text-tertiary">Sale status</dt><dd className="mt-1 text-text-primary">{salesStatus(event)}</dd></div><div><dt className="text-text-tertiary">Variant count</dt><dd className="mt-1 text-text-primary">{event.variants.length}</dd></div></dl></Card>
    {presale ? <Card className="border-warning-strong bg-warning-bg"><h3 className="font-medium text-text-primary">Waiting for ticket sales</h3><p className="mt-2 text-sm text-text-secondary">Kide is not currently returning ticket variants for this event. Ticket types can be checked again when sales begin.</p></Card> : event.variants.length ? <KideVariantList variants={event.variants} /> : <Card><p className="text-sm text-text-secondary">Kide is not currently returning ticket variants for this event.</p></Card>}
  </div>;
}
