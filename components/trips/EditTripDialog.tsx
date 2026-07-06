"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { updateTrip } from "@/lib/actions/trips";
import { TRIP_STATUS_LABELS } from "@/types/trip";
import type { Trip, TripStatus } from "@/types/trip";

const STATUSES = Object.keys(TRIP_STATUS_LABELS) as TripStatus[];

export function EditTripDialog({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateTrip(trip.id, formData);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save changes.");
      }
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil size={16} strokeWidth={1.75} />
        Edit trip
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Edit trip details">
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input name="title" defaultValue={trip.title} required />
            </Field>
            <Field label="Destination">
              <Input name="destination" defaultValue={trip.destination} required />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Departure city">
              <Input name="departure_city" defaultValue={trip.departure_city ?? ""} />
            </Field>
            <Field label="Date window">
              <Input name="date_window" defaultValue={trip.date_window ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Duration (days)">
              <Input
                name="duration_days"
                type="number"
                min={1}
                defaultValue={trip.duration_days ?? undefined}
              />
            </Field>
            <Field label="Travelers">
              <Input name="travelers" type="number" min={1} defaultValue={trip.travelers} />
            </Field>
            <Field label="Currency">
              <Input name="currency" defaultValue={trip.currency} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Budget min">
              <Input
                name="budget_min"
                type="number"
                min={0}
                defaultValue={trip.budget_min ?? undefined}
              />
            </Field>
            <Field label="Budget max">
              <Input
                name="budget_max"
                type="number"
                min={0}
                defaultValue={trip.budget_max ?? undefined}
              />
            </Field>
          </div>
          <Field label="Interests" hint="Comma-separated">
            <Input name="interests" defaultValue={trip.interests.join(", ")} />
          </Field>
          <Field label="Travel style">
            <Input name="travel_style" defaultValue={trip.travel_style ?? ""} />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={trip.status}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TRIP_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea name="notes" rows={3} defaultValue={trip.notes ?? ""} />
          </Field>
          {error && <p className="text-sm text-danger-strong">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
