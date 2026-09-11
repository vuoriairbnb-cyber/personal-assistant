import { bankOfFinlandSourceAdapter } from "./bank-of-finland";
import { ecbSourceAdapter } from "./ecb";
import type { MorningBriefSourceAdapter } from "./types";
import { yleSourceAdapter } from "./yle";

export const MORNING_BRIEF_SOURCE_ADAPTERS: readonly MorningBriefSourceAdapter[] = [yleSourceAdapter, bankOfFinlandSourceAdapter, ecbSourceAdapter];
export * from "./config";
export * from "./types";
