"use client";

import { useEffect, useState } from "react";
import type { KideReservationResult } from "@/lib/kide/types";
import { Card } from "@/components/ui/Card";
import { formatKidePrice, formatReservationTimeLeft } from "./kide-format";

export function KideReservationResultCard({ reservation }: { reservation: KideReservationResult }) {
  const [timeLeft, setTimeLeft] = useState(reservation.reservationsTimeLeft);
  useEffect(() => {
    setTimeLeft(reservation.reservationsTimeLeft);
  }, [reservation]);
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = window.setInterval(() => setTimeLeft((value) => value === null ? null : Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [timeLeft]);

  const firstReservation = reservation.reservations[0];
  return <Card className="border-success-strong bg-success-bg"><p className="text-xs font-medium uppercase tracking-wide text-success-strong">Reserved successfully</p><h2 className="mt-2 font-serif text-xl text-text-primary">{firstReservation?.productName ?? "Kide reservation"}</h2>{firstReservation?.variantName && <p className="mt-1 text-sm text-text-secondary">{firstReservation.variantName}</p>}<dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-text-tertiary">Quantity</dt><dd className="mt-1 text-text-primary">{firstReservation?.reservedQuantity ?? reservation.reservationsCount}</dd></div><div><dt className="text-text-tertiary">Final price</dt><dd className="mt-1 text-text-primary">{formatKidePrice(reservation.finalPrice, reservation.currencyCode ?? firstReservation?.currencyCode ?? null)}</dd></div><div><dt className="text-text-tertiary">Reservation time remaining</dt><dd className="mt-1 text-text-primary">{formatReservationTimeLeft(timeLeft)}</dd></div></dl><p className="mt-5 text-sm text-text-secondary">Complete payment in Kide.app.</p><p className="mt-2 text-xs text-text-tertiary">Temporary reservation can currently be removed through Kide.app.</p></Card>;
}
