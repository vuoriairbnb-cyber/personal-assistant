import Link from "next/link";
import { MapPin, Users, CalendarRange } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { formatCurrency } from "@/lib/utils/format";
import { TRIP_STATUS_LABELS } from "@/types/trip";
import type { Trip, TripStatus } from "@/types/trip";

const STATUS_TONE: Record<TripStatus, "neutral" | "accent" | "success" | "warning"> = {
  planning: "neutral",
  active: "accent",
  booked: "success",
  completed: "neutral",
  archived: "neutral",
};

export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Link href={`/trips/${trip.id}`} className="block h-full">
      <Card hoverable className="h-full">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg text-text-primary">{trip.title}</h3>
          <Badge tone={STATUS_TONE[trip.status]}>{TRIP_STATUS_LABELS[trip.status]}</Badge>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-text-secondary">
          <p className="flex items-center gap-1.5">
            <MapPin size={14} strokeWidth={1.75} />
            {trip.destination}
          </p>
          {trip.date_window && (
            <p className="flex items-center gap-1.5 font-mono text-xs">
              <CalendarRange size={14} strokeWidth={1.75} />
              {trip.date_window}
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <Users size={14} strokeWidth={1.75} />
            {trip.travelers} traveler{trip.travelers === 1 ? "" : "s"}
          </p>
        </div>

        {(trip.budget_min || trip.budget_max) && (
          <p className="mt-3 font-mono text-sm text-text-primary">
            {formatCurrency(trip.budget_min, trip.currency)} – {formatCurrency(trip.budget_max, trip.currency)}
          </p>
        )}

        {trip.interests.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {trip.interests.slice(0, 4).map((interest) => (
              <Tag key={interest}>{interest}</Tag>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}
