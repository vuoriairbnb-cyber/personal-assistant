"use client";

import { useState, useTransition } from "react";
import { reserveKideTicket } from "@/lib/actions/kide";
import type { KideEvent, KideReservationResult, KideVariant } from "@/lib/kide/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatKidePrice } from "./kide-format";

type Props = {
  event: KideEvent;
  variant: KideVariant | null;
  onClose: () => void;
  onReserved: (reservation: KideReservationResult) => void;
};

export function KideReservationDialog({ event, variant, onClose, onReserved }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const open = Boolean(variant);

  function close() {
    if (!pending) {
      setError(null);
      onClose();
    }
  }

  function reserve() {
    if (!variant?.inventoryId) return;
    setError(null);
    startTransition(async () => {
      const result = await reserveKideTicket({ eventId: event.id, variantId: variant.id, inventoryId: variant.inventoryId, quantity: 1 });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onReserved(result.reservation);
      onClose();
    });
  }

  return <Dialog open={open} onClose={close} title="Reserve this ticket?" description="This creates a real temporary reservation in Kide. No payment will be made." footer={<><Button type="button" variant="secondary" onClick={close} disabled={pending}>Cancel</Button><Button type="button" onClick={reserve} disabled={!variant?.inventoryId || pending}>{pending ? "Creating reservation…" : "Create reservation"}</Button></>}>
    {variant && <div className="space-y-3 text-sm"><div><p className="text-text-tertiary">Event</p><p className="mt-1 text-text-primary">{event.name}</p></div><div><p className="text-text-tertiary">Ticket</p><p className="mt-1 text-text-primary">{variant.name} · {formatKidePrice(variant.pricePerItem, variant.currencyCode)}</p></div><p className="text-text-secondary">Quantity: 1</p>{(variant.membershipRequired || variant.hakaRequired || variant.studentCardRequired) && <p className="rounded-md bg-warning-bg p-3 text-text-secondary">Kide verifies account permission for this ticket.</p>}{error && <p className="rounded-md bg-danger-bg p-3 text-danger-strong">{error}</p>}</div>}
  </Dialog>;
}
