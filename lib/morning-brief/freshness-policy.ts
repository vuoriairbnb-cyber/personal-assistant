import type { MorningBriefContentType } from "./taxonomy";

export type MorningBriefFreshnessClass = "standard_news" | "official_macro_release" | "portfolio_manager_update" | "long_form_research";
export const MORNING_BRIEF_FRESHNESS_POLICY: Record<MorningBriefFreshnessClass, number> = { standard_news: 48, official_macro_release: 120, portfolio_manager_update: 720, long_form_research: 336 };
export const MAX_MORNING_BRIEF_ELIGIBILITY_WINDOW_HOURS = Math.max(...Object.values(MORNING_BRIEF_FRESHNESS_POLICY));

type FreshnessInput = { rawMetadata?: unknown; contentType?: MorningBriefContentType | null };
const record = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const isFreshnessClass = (value: unknown): value is MorningBriefFreshnessClass => value === "standard_news" || value === "official_macro_release" || value === "portfolio_manager_update" || value === "long_form_research";

/** Deterministic pre-AI source hints take precedence; unknown content remains conservative. */
export function deriveMorningBriefFreshnessClass(input: FreshnessInput): MorningBriefFreshnessClass {
  const raw = record(input.rawMetadata); const pynType = raw.pyn_content_type;
  if (isFreshnessClass(raw.freshness_class)) return raw.freshness_class;
  if (pynType === "monthly_review" || pynType === "investor_letter" || pynType === "market_commentary" || pynType === "fund_update") return "portfolio_manager_update";
  if (raw.source_family === "official_primary_statistics") return "official_macro_release";
  if (input.contentType === "long_read") return "long_form_research";
  return "standard_news";
}

export function morningBriefEligibilityWindowHours(input: FreshnessInput) { return MORNING_BRIEF_FRESHNESS_POLICY[deriveMorningBriefFreshnessClass(input)]; }
export function isMorningBriefEligible(publishedAt: string, input: FreshnessInput, now: Date) {
  const timestamp = Date.parse(publishedAt); return Number.isFinite(timestamp) && timestamp >= now.getTime() - morningBriefEligibilityWindowHours(input) * 3_600_000;
}
