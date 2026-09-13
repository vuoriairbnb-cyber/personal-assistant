import { bankOfFinlandSourceAdapter } from "./bank-of-finland";
import { ecbSourceAdapter } from "./ecb";
import { eurostatSourceAdapter } from "./eurostat";
import { federalReserveSourceAdapter } from "./federal-reserve";
import type { MorningBriefSourceAdapter } from "./types";
import { pynEliteSourceAdapter } from "./pyn-elite";
import { vietnamStatisticsSourceAdapter } from "./vietnam-statistics";
import { yleSourceAdapter } from "./yle";

export const MORNING_BRIEF_SOURCE_ADAPTERS: readonly MorningBriefSourceAdapter[] = [
  yleSourceAdapter,
  bankOfFinlandSourceAdapter,
  ecbSourceAdapter,
  pynEliteSourceAdapter,
  vietnamStatisticsSourceAdapter,
  federalReserveSourceAdapter,
  eurostatSourceAdapter,
];
export * from "./config";
export * from "./types";
