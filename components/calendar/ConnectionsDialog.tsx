"use client";

import { Dialog } from "@/components/ui/Dialog";
import { ConnectionCard } from "@/components/calendar/ConnectionCard";
import type { CalendarConnection } from "@/lib/calendar/types";

export function ConnectionsDialog({
  open,
  onClose,
  connections,
  now,
  onSync,
  onDisconnect,
  onConnect,
}: {
  open: boolean;
  onClose: () => void;
  connections: CalendarConnection[];
  now: Date;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  onConnect: (id: string) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Manage connections">
      <div className="space-y-4">
        {connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            now={now}
            onSync={onSync}
            onDisconnect={onDisconnect}
            onConnect={onConnect}
          />
        ))}
      </div>

      <p className="mt-5 rounded-md bg-card-hover px-3 py-2.5 text-[11px] leading-snug text-text-secondary">
        Synced calendars are read-only here. Nothing is ever written back to Google or
        Airbnb from this app.
      </p>
    </Dialog>
  );
}
