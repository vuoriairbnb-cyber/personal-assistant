import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { SupabaseRateLimiter } from "./supabase";
import type { RateLimiter } from "./types";

const supabaseLimiter = new SupabaseRateLimiter(async (userHash) => createServiceSupabaseClient().rpc("take_golf_rate_limit", { p_user_hash: userHash }));
export function getGolfRateLimiter(): RateLimiter { return supabaseLimiter; }
