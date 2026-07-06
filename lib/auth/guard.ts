import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

/**
 * Every server action that creates or changes data must call this first.
 * Row Level Security enforces the same rule at the database layer — this is
 * the redundant, defense-in-depth check at the application layer so a bug in
 * one doesn't leave the other as the only gate.
 */
export async function requireApprovedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) throw new Error("Profile not found.");
  if (profile.status !== "approved") {
    throw new Error("Your account is not approved yet.");
  }

  return { user, profile: profile as Profile, supabase };
}

/** For owner-only actions (approving/rejecting users, changing roles). */
export async function requireOwner() {
  const { user, profile, supabase } = await requireApprovedUser();
  if (profile.role !== "owner") {
    throw new Error("Owner access required.");
  }
  return { user, profile, supabase };
}
