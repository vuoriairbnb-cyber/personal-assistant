"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedUser } from "@/lib/auth/guard";
import { fetchMemberPlusUnions } from "@/lib/benefits/providers/memberplus";

export async function saveSettings(formData: FormData) {
  const { user, supabase } = await requireApprovedUser();

  const defaultModel = String(formData.get("default_model") ?? "claude-sonnet-5-20251001");
  const currency = String(formData.get("currency") ?? "EUR");
  const language = String(formData.get("language") ?? "en");
  const memberPlusUnionId = String(formData.get("member_plus_union_id") ?? "").trim() || null;
  const memberPlusUnionName = memberPlusUnionId ? (await fetchMemberPlusUnions()).find((union) => union.id === memberPlusUnionId)?.name ?? null : null;
  if (memberPlusUnionId && !memberPlusUnionName) throw new Error("Selected Member+ union is not available.");

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { user_id: user.id, default_model: defaultModel, currency, language },
      { onConflict: "user_id" }
    );

  if (error) throw new Error(error.message);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ member_plus_union_id: memberPlusUnionId, member_plus_union_name: memberPlusUnionName })
    .eq("id", user.id);
  if (profileError) throw new Error(profileError.message);

  revalidatePath("/settings");
}
