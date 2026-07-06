"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { saveRawPlan } from "@/lib/actions/trips";

export function RawPlanEditor({ tripId, initialValue }: { tripId: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    const formData = new FormData();
    formData.set("raw_plan", value);
    startTransition(async () => {
      await saveRawPlan(tripId, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={14}
        placeholder="Paste the plan you sparred on in ChatGPT or Claude chat here — flights, lodging ideas, day-by-day notes, anything."
      />
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save raw plan"}
        </Button>
        {saved && <span className="text-sm text-success-strong">Saved</span>}
      </div>
    </div>
  );
}
