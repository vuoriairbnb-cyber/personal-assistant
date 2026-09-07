export type BenefitProviderId = "memberplus" | "cityshoppari" | "frank";
export type BenefitRedemptionType = "code" | "link" | "instructions" | "cityshoppari_app" | "provider_app" | "provider_link" | "unknown";

export type NormalizedBenefit = {
  provider: BenefitProviderId;
  externalId: string;
  title: string;
  heading: string | null;
  description: string;
  providerCategory: string | null;
  normalizedCategory: string | null;
  offerer: string | null;
  locations: string[];
  restrictions: string | null;
  benefitText: string | null;
  redemptionType: BenefitRedemptionType;
  redemptionCode: string | null;
  redemptionUrl: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  validFrom: string | null;
  validUntil: string | null;
  unionId: string | null;
  unionName: string | null;
  isGeneralBenefit: boolean;
  isRecommended: boolean;
  providerMetadata: Record<string, unknown> | null;
  searchText: string;
};

export type BenefitSearchUser = { memberPlusUnionId: string | null; memberPlusUnionName: string | null };
export type BenefitProvider = { id: BenefitProviderId; listBenefits(): Promise<NormalizedBenefit[]> };
export type MemberPlusUnion = { id: string; name: string };
