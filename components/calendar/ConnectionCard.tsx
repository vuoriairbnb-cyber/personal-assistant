"use client";

import { AlertCircle, Loader2, Plug } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ProviderMark } from "@/components/calendar/ProviderMark";
import { formatRelativeTime } from "@/lib/calendar/format";
import type { CalendarConnection, ConnectionStatus } from "@/lib/calendar/types";

const STATUS_BADGE: Record<ConnectionStatus, { label: string; classes: string }> = {
  connected: { label: "Connected", classes: "bg-[#EAF7F0] text-[#136F4C]" },
  syncing: { label: "Syncing…", classes: "bg-accent-subtle text-accent" },
  error: { label: "Error", classes: "bg-[#FDECEC] text-[#B23A3A]" },
  disconnected: { label: "Not connected", classes: "bg-border-subtle text-text-secondary" },
};

export function ConnectionCard({
  connection,
  now,
  onSync,
  onDisconnect,
  onConnect,
}: {
  connection: CalendarConnection;
  now: Date;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  onConnect: (id: string) => void;
}) {
  const badge = STATUS_BADGE[connection.status];
  const isSyncing = connection.status === "syncing";

  return (
    <div className="rounded-[14px] border border-border-subtle bg-card-hover p-3">
      <div className="flex items-center gap-2.5">
        <ProviderMark provider={connection.provider} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-text-primary">{connection.name}</p>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              badge.classes
            )}
          >
            {isSyncing ? <Loader2 size={9} className="animate-spin" aria-hidden /> : null}
            {connection.status === "error" ? <AlertCircle size={9} aria-hidden /> : null}
            {badge.label}
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-[12px] text-text-secondary">
        {connection.status === "error"
          ? (connection.error ?? "Sync failed.")
          : connection.status === "disconnected"
            ? "Connect to pull events into this calendar."
            : formatRelativeTime(connection.lastSyncedAt, now)}
      </p>

      <div className="mt-2.5 flex gap-2">
        {connection.status === "disconnected" ? (
          <SmallButton variant="primary" onClick={() => onConnect(connection.id)}>
            <Plug size={12} />
            Connect
          </SmallButton>
        ) : connection.status === "error" ? (
          <>
            <SmallButton variant="primary" onClick={() => onSync(connection.id)}>
              Reconnect
            </SmallButton>
            <SmallButton onClick={() => onSync(connection.id)}>Retry</SmallButton>
          </>
        ) : (
          <>
            <SmallButton onClick={() => onSync(connection.id)} disabled={isSyncing}>
              {isSyncing ? "Syncing…" : "Sync now"}
            </SmallButton>
            <SmallButton onClick={() => onDisconnect(connection.id)} disabled={isSyncing}>
              Disconnect
            </SmallButton>
          </>
        )}
      </div>
    </div>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[12px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-accent text-white hover:bg-accent-hover"
          : "border border-border-default bg-card text-text-secondary hover:bg-border-subtle hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
