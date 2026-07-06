import { Badge } from "@/components/ui/Badge";
import { TRIP_STATUS_LABELS } from "@/types/trip";
import type { Trip, TripStatus } from "@/types/trip";

const STATUS_TONE: Record<TripStatus, "neutral" | "accent" | "success" | "warning"> = {
  planning: "neutral",
  active: "accent",
  booked: "success",
  completed: "neutral",
  archived: "neutral",
};

export function TripHeader({ trip, actions }: { trip: Trip; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border-subtle pb-6 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl text-text-primary">{trip.title}</h1>
          <Badge tone={STATUS_TONE[trip.status]}>{TRIP_STATUS_LABELS[trip.status]}</Badge>
        </div>
        <p className="mt-1.5 text-text-secondary">
          {trip.destination}
          {trip.departure_city ? ` · from ${trip.departure_city}` : ""}
          {trip.date_window ? ` · ${trip.date_window}` : ""}
        </p>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}
