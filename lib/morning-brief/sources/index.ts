import { bankOfFinlandSourceAdapter } from "./bank-of-finland";
import { bisSourceAdapter } from "./bis";
import { dgEcfinSourceAdapter } from "./dg-ecfin";
import { ecbSourceAdapter } from "./ecb";
import { economicAffairsFinlandSourceAdapter } from "./economic-affairs-finland";
import { eurostatSourceAdapter } from "./eurostat";
import { financeMinistrySourceAdapter } from "./finance-ministry";
import { federalReserveSourceAdapter } from "./federal-reserve";
import { norgesBankSourceAdapter } from "./norges-bank";
import type { MorningBriefSourceAdapter } from "./types";
import { pynEliteSourceAdapter } from "./pyn-elite";
import { riksbankSourceAdapter } from "./riksbank";
import { statisticsFinlandSourceAdapter } from "./statistics-finland";
import { vietnamStatisticsSourceAdapter } from "./vietnam-statistics";
import { vietnamGovernmentSourceAdapter } from "./vietnam-government";
import { yleSourceAdapter } from "./yle";

export const MORNING_BRIEF_SOURCE_ADAPTERS: readonly MorningBriefSourceAdapter[] = [
  yleSourceAdapter,
  bankOfFinlandSourceAdapter,
  ecbSourceAdapter,
  pynEliteSourceAdapter,
  vietnamStatisticsSourceAdapter,
  federalReserveSourceAdapter,
  eurostatSourceAdapter,
  statisticsFinlandSourceAdapter,
  financeMinistrySourceAdapter,
  riksbankSourceAdapter,
  norgesBankSourceAdapter,
  vietnamGovernmentSourceAdapter,
  economicAffairsFinlandSourceAdapter,
  bisSourceAdapter,
  dgEcfinSourceAdapter,
];
export * from "./config";
export * from "./types";
