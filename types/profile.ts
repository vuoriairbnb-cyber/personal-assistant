import type { Database, ProfileRole, ProfileStatus } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type { ProfileRole, ProfileStatus };

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const PROFILE_ROLE_LABELS: Record<ProfileRole, string> = {
  owner: "Owner",
  family: "Family",
  user: "User",
};
