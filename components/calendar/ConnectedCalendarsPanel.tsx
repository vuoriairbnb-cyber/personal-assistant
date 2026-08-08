"use client";

import { Settings2 } from "lucide-react";
import { ConnectionCard } from "@/components/calendar/ConnectionCard";
import type { CalendarConnection } from "@/lib/calendar/types";

export function ConnectedCalendarsPanel({
  connections,
  now,
  onSync,
  onDisconnect,
  onConnect,
  onManage,
}: {
  connections: CalendarConnection[];
  now: Date;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  onConnect: (id: string) => void;
  onManage: () => void;
}) {
  return (
    <section className="rounded-lg border border-border-default bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-text-primary">Connected calendars</h2>
        <button
          type="button"
          onClick={onManage}
          aria-label="Manage connections"
          className="grid h-7 w-7 place-items-center rounded-full text-text-tertiary transition-colors duration-150 hover:bg-border-subtle hover:text-text-primary"
        >
          <Settings2 size={15} />
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
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

      <button
        type="button"
        onClick={onManage}
        className="mt-3 w-full rounded-md border border-border-subtle py-2 text-[13px] font-semibold text-accent transition-colors duration-150 hover:bg-accent-subtle"
      >
        Manage connections
      </button>
    </section>
  );
}
