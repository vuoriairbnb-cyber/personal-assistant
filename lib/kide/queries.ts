import "server-only";
import { requireApprovedUser } from "@/lib/auth/guard";

export async function getKideControlPlane() {
  const { user, supabase } = await requireApprovedUser();
  const [{ data: device }, { data: watch }] = await Promise.all([
    supabase.from("kide_agent_devices").select("id,name,last_seen_at,revoked_at").eq("user_id", user.id).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("kide_watches").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return { device, watch };
}
