import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/trips/queries";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button, ButtonLink } from "@/components/ui/Button";
import { saveSettings } from "@/lib/actions/settings";
import { signOut } from "@/lib/actions/auth";
import { AiCostsSection } from "@/components/settings/AiCostsSection";
import { fetchMemberPlusUnions } from "@/lib/benefits/providers/memberplus";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const settings = await getAppSettings();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role,member_plus_union_id").eq("id", user.id).single()
    : { data: null };
  const isOwner = profile?.role === "owner";
  const unions = await fetchMemberPlusUnions().catch(() => []);

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-text-primary">Settings</h1>
        <p className="mt-1 text-text-secondary">Account and default preferences.</p>
      </div>

      <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Account</p>
        <p className="mt-2 text-text-primary">{user?.email}</p>
        <form action={signOut} className="mt-4">
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </Card>

      <Card>
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          Defaults
        </p>
        <form action={saveSettings} className="space-y-4">
          <Field label="Default Claude model">
            <Select
              name="default_model"
              defaultValue={settings?.default_model ?? "claude-sonnet-5-20251001"}
            >
              <option value="claude-sonnet-5-20251001">Claude Sonnet 5</option>
              <option value="claude-opus-4-8">Claude Opus 4.8</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            </Select>
          </Field>
          <Field label="Currency">
            <Input name="currency" defaultValue={settings?.currency ?? "EUR"} />
          </Field>
          <Field label="Language">
            <Input name="language" defaultValue={settings?.language ?? "en"} />
          </Field>
          <Field label="Member+ union">
            <Select name="member_plus_union_id" defaultValue={profile?.member_plus_union_id ?? ""}>
              <option value="">No union selected (general benefits only)</option>
              {unions.map((union) => <option key={union.id} value={union.id}>{union.name}</option>)}
            </Select>
          </Field>
          <Button type="submit">Save settings</Button>
        </form>
      </Card>

      {isOwner && (
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Private access
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Approve or reject account requests, and set family/user roles.
          </p>
          <ButtonLink href="/settings/users" variant="secondary" className="mt-4">
            Manage users
          </ButtonLink>
        </Card>
      )}

      <AiCostsSection />
    </div>
  );
}
