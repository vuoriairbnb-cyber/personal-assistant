"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { saveNotes } from "@/lib/actions/trips";

export function NotesEditor({ tripId, initialValue }: { tripId: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    const formData = new FormData();
    formData.set("notes", value);
    startTransition(async () => {
      await saveNotes(tripId, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        placeholder="Anything else worth keeping with this trip."
      />
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save notes"}
        </Button>
        {saved && <span className="text-sm text-success-strong">Saved</span>}
      </div>
    </div>
  );
}
