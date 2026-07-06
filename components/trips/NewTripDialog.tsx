"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createTrip } from "@/lib/actions/trips";

export function NewTripDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} strokeWidth={1.75} />
        New trip
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New trip"
        description="Start a trip project. You can flesh out details and paste a plan afterward."
      >
        <form action={createTrip} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input name="title" required placeholder="Madeira 2027" />
            </Field>
            <Field label="Destination">
              <Input name="destination" required placeholder="Madeira" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Departure city">
              <Input name="departure_city" placeholder="Helsinki" />
            </Field>
            <Field label="Date window">
              <Input name="date_window" placeholder="March 2027" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Duration (days)">
              <Input name="duration_days" type="number" min={1} />
            </Field>
            <Field label="Travelers">
              <Input name="travelers" type="number" min={1} defaultValue={1} />
            </Field>
            <Field label="Currency">
              <Input name="currency" defaultValue="EUR" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Budget min">
              <Input name="budget_min" type="number" min={0} />
            </Field>
            <Field label="Budget max">
              <Input name="budget_max" type="number" min={0} />
            </Field>
          </div>
          <Field label="Interests" hint="Comma-separated">
            <Input name="interests" placeholder="hiking, golf, food, sea views" />
          </Field>
          <Field label="Travel style">
            <Input name="travel_style" placeholder="Active, comfortable, local experiences" />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" rows={3} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create trip</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
