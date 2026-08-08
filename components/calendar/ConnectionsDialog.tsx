"use client";

import { Dialog } from "@/components/ui/Dialog";
import { ConnectionCard } from "@/components/calendar/ConnectionCard";
import type { CalendarConnection, ConnectionStatus } from "@/lib/calendar/types";

const STATE_ORDER: ConnectionStatus[] = ["connected", "syncing", "error", "disconnected"];

const STATE_HINTS: Record<ConnectionStatus, string> = {
  connected: "Events are flowing in and stay read-only in this calendar.",
  syncing: "A refresh is in flight — actions are disabled until it finishes.",
  error: "Auth expired or the feed URL is invalid. Reconnect or retry.",
  disconnected: "Nothing is being pulled in from this provider.",
};

/**
 * Connection management. Each real connection is listed with its live state, and
 * below it the four possible states are shown as switchable previews — that's
 * how the syncing/error/disconnected UI stays demonstrable without cluttering
 * the main panel with demo controls.
 */
export function ConnectionsDialog({
  open,
  onClose,
  connections,
  now,
  onSync,
  onDisconnect,
  onConnect,
  onSetStatus,
}: {
  open: boolean;
  onClose: () => void;
  connections: CalendarConnection[];
  now: Date;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  onConnect: (id: string) => void;
  onSetStatus: (id: string, status: ConnectionStatus) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Manage connections">
      <div className="space-y-4">
        {connections.map((connection) => (
          <div key={connection.id}>
            <ConnectionCard
              connection={connection}
              now={now}
              onSync={onSync}
              onDisconnect={onDisconnect}
              onConnect={onConnect}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STATE_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onSetStatus(connection.id, status)}
                  aria-pressed={connection.status === status}
                  title={STATE_HINTS[status]}
                  className={
                    connection.status === status
                      ? "rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold capitalize text-accent-foreground"
                      : "rounded-full border border-border-default px-2.5 py-1 text-[11px] font-medium capitalize text-text-secondary transition-colors duration-150 hover:bg-sand-200"
                  }
                >
                  {status}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-text-tertiary">
              {STATE_HINTS[connection.status]}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-md bg-card-hover px-3 py-2.5 text-[11px] leading-snug text-text-secondary">
        Synced calendars are read-only here. Nothing is ever written back to Google or
        Airbnb from this app.
      </p>
    </Dialog>
  );
}
