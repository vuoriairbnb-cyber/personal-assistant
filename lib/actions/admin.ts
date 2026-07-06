"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/guard";
import type { ProfileRole } from "@/types/profile";

const ASSIGNABLE_ROLES: ProfileRole[] = ["user", "family"];

export async function approveUser(profileId: string) {
  const { user, supabase } = await requireOwner();

  const { error } = await supabase
    .from("profiles")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejected_at: null,
    })
    .eq("id", profileId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}

export async function rejectUser(profileId: string) {
  const { supabase } = await requireOwner();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "rejected", rejected_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}

export async function setUserRole(profileId: string, role: ProfileRole) {
  const { supabase } = await requireOwner();

  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error("Owner role can't be assigned from this page — set it directly in Supabase.");
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
}
