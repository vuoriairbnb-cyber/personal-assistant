"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { deleteTrip } from "@/lib/actions/trips";

export function DeleteTripButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Trash2 size={16} strokeWidth={1.75} />
        Delete
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this trip?"
        description="This removes the trip and every saved AI output. This can't be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={isPending}
              onClick={() => startTransition(() => deleteTrip(tripId))}
            >
              {isPending ? "Deleting…" : "Delete trip"}
            </Button>
          </>
        }
      />
    </>
  );
}
