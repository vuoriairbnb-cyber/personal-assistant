"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { approveUser, rejectUser, setUserRole } from "@/lib/actions/admin";
import { PROFILE_ROLE_LABELS } from "@/types/profile";
import type { Profile, ProfileRole } from "@/types/profile";
import { formatDateTime } from "@/lib/utils/format";

export function UserRow({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-subtle bg-card p-3">
      <div>
        <p className="text-sm font-medium text-text-primary">
          {profile.email} {isSelf && <span className="text-text-tertiary">(you)</span>}
        </p>
        <p className="text-xs text-text-tertiary">
          {profile.full_name ?? "No name set"} · Joined {formatDateTime(profile.created_at)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge tone={profile.role === "owner" ? "accent" : "neutral"}>
          {PROFILE_ROLE_LABELS[profile.role]}
        </Badge>

        {profile.status === "pending" && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => run(() => approveUser(profile.id))}
              disabled={isPending}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => run(() => rejectUser(profile.id))}
              disabled={isPending}
            >
              Reject
            </Button>
          </>
        )}

        {profile.status === "approved" && profile.role !== "owner" && !isSelf && (
          <Select
            value={profile.role}
            disabled={isPending}
            onChange={(e) => run(() => setUserRole(profile.id, e.target.value as ProfileRole))}
            className="h-8 w-auto text-xs"
          >
            <option value="user">User</option>
            <option value="family">Family</option>
          </Select>
        )}

        {profile.status === "rejected" && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => run(() => approveUser(profile.id))}
            disabled={isPending}
          >
            Approve
          </Button>
        )}
      </div>

      {error && <p className="w-full text-xs text-danger-strong">{error}</p>}
    </div>
  );
}
