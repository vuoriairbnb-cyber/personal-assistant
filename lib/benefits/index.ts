import "server-only";
import { memberPlusProvider } from "@/lib/benefits/providers/memberplus";
import { cityShoppariProvider } from "@/lib/benefits/providers/cityshoppari";
import { rankBenefits } from "@/lib/benefits/search";
import type { BenefitProvider, BenefitSearchUser, NormalizedBenefit } from "@/lib/benefits/types";

const providers: BenefitProvider[] = [memberPlusProvider, cityShoppariProvider];
export async function searchBenefits(query: string, user: BenefitSearchUser): Promise<NormalizedBenefit[]> { const results = await Promise.all(providers.map(async (provider) => { try { const benefits = await provider.listBenefits(); console.info("[benefits] provider count", { provider: provider.id, count: benefits.length }); return benefits; } catch { console.warn("[benefits] provider failed", { provider: provider.id }); return []; } })); return rankBenefits(results.flat(), query, user); }
