"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedUser } from "@/lib/auth/guard";

export async function saveSettings(formData: FormData) {
  const { user, supabase } = await requireApprovedUser();

  const defaultModel = String(formData.get("default_model") ?? "claude-sonnet-5-20251001");
  const currency = String(formData.get("currency") ?? "EUR");
  const language = String(formData.get("language") ?? "en");

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { user_id: user.id, default_model: defaultModel, currency, language },
      { onConflict: "user_id" }
    );

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
