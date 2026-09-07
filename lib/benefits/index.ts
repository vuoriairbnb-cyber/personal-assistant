import "server-only";
import { memberPlusProvider } from "@/lib/benefits/providers/memberplus";
import { cityShoppariProvider } from "@/lib/benefits/providers/cityshoppari";
import { rankBenefits } from "@/lib/benefits/search";
import type { BenefitProvider, BenefitSearchUser, NormalizedBenefit } from "@/lib/benefits/types";

const providers: BenefitProvider[] = [memberPlusProvider, cityShoppariProvider];
export async function searchBenefits(query: string, user: BenefitSearchUser): Promise<NormalizedBenefit[]> { const results = await Promise.all(providers.map((provider) => provider.listBenefits().catch(() => []))); return rankBenefits(results.flat(), query, user); }
