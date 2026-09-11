export const MORNING_BRIEF_CATEGORIES = [
  "finland_politics", "finland_business", "finland_economy", "global_politics", "geopolitics",
  "markets_macro", "rates", "fx", "commodities", "venture_capital", "private_equity",
  "emerging_markets", "frontier_markets", "emerging_frontier", "vietnam", "european_high_yield",
  "nordic_high_yield", "credit", "leveraged_finance", "syndicated_loans", "private_credit",
  "banking", "consumer", "property", "industrials", "energy", "shipping", "telecom",
] as const;

export const MORNING_BRIEF_SECTIONS = ["top_5", "vietnam", "credit", "finland", "markets", "politics", "emerging_frontier", "vc_pe", "world", "worth_reading"] as const;
export const MORNING_BRIEF_CONTENT_TYPES = ["breaking_news", "news", "analysis", "opinion", "explainer", "long_read"] as const;
export const MORNING_BRIEF_FEEDBACK_TYPES = ["impression", "open", "like", "unlike", "save", "unsave", "not_relevant", "show_fewer_like_this", "import"] as const;

export type MorningBriefCategory = (typeof MORNING_BRIEF_CATEGORIES)[number];
export type MorningBriefSection = (typeof MORNING_BRIEF_SECTIONS)[number];
export type MorningBriefContentType = (typeof MORNING_BRIEF_CONTENT_TYPES)[number];
export type MorningBriefFeedbackType = (typeof MORNING_BRIEF_FEEDBACK_TYPES)[number];

function includes<T extends readonly string[]>(values: T, value: string): value is T[number] { return values.includes(value); }
export const isMorningBriefCategory = (value: string): value is MorningBriefCategory => includes(MORNING_BRIEF_CATEGORIES, value);
export const isMorningBriefSection = (value: string): value is MorningBriefSection => includes(MORNING_BRIEF_SECTIONS, value);
export const isMorningBriefContentType = (value: string): value is MorningBriefContentType => includes(MORNING_BRIEF_CONTENT_TYPES, value);
export const isMorningBriefFeedbackType = (value: string): value is MorningBriefFeedbackType => includes(MORNING_BRIEF_FEEDBACK_TYPES, value);
