import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserRow } from "@/components/admin/UserRow";
import type { Profile } from "@/types/profile";

export default async function UsersAdminPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!currentProfile || currentProfile.role !== "owner") {
    redirect("/dashboard");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const all = (profiles ?? []) as Profile[];
  const pending = all.filter((p) => p.status === "pending");
  const approved = all.filter((p) => p.status === "approved");
  const rejected = all.filter((p) => p.status === "rejected");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-text-primary">User access</h1>
        <p className="mt-1 text-text-secondary">
          This app is private — approve who&apos;s allowed in, and set family or user roles.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-text-primary">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState title="No pending requests" />
        ) : (
          <div className="space-y-2">
            {pending.map((profile) => (
              <UserRow key={profile.id} profile={profile} isSelf={profile.id === user.id} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-text-primary">Approved ({approved.length})</h2>
        <div className="space-y-2">
          {approved.map((profile) => (
            <UserRow key={profile.id} profile={profile} isSelf={profile.id === user.id} />
          ))}
        </div>
      </section>

      {rejected.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-xl text-text-primary">Rejected ({rejected.length})</h2>
          <div className="space-y-2">
            {rejected.map((profile) => (
              <UserRow key={profile.id} profile={profile} isSelf={profile.id === user.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
