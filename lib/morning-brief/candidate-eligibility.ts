export type MorningBriefCandidateMarkers = {
  sourceSlug?: string | null;
  sourceMetadata?: Record<string, unknown> | null;
  articleMetadata?: Record<string, unknown> | null;
  canonicalUrl?: string | null;
  classificationVersion?: string | null;
};

const enabled = (metadata: Record<string, unknown> | null | undefined, key: string) => metadata?.[key] === true;
export const TRUSTED_LIVE_MORNING_BRIEF_SOURCE_SLUGS = ["yle", "bank-of-finland", "ecb"] as const;
export const isTrustedLiveMorningBriefSource = (slug: string | null | undefined) => Boolean(slug && (TRUSTED_LIVE_MORNING_BRIEF_SOURCE_SLUGS as readonly string[]).includes(slug));

/** Existing durable markers distinguish development fixtures from real content. */
export function isMockMorningBriefCandidate(input: MorningBriefCandidateMarkers) {
  return enabled(input.articleMetadata, "development_mock")
    || input.canonicalUrl?.startsWith("https://mock.local/") === true
    || input.classificationVersion === "mock-classifier-v1"
    // A previous mock seeder reused the trusted Yle slug. Its article-level markers
    // remain authoritative, while this exception keeps already-ingested real Yle rows usable.
    || (enabled(input.sourceMetadata, "development_mock") && !isTrustedLiveMorningBriefSource(input.sourceSlug));
}

export function isLivePublicMorningBriefCandidate(input: MorningBriefCandidateMarkers) {
  return enabled(input.sourceMetadata, "live_public_source") || enabled(input.articleMetadata, "live_public_source") || isTrustedLiveMorningBriefSource(input.sourceSlug);
}

export function isImportedMorningBriefCandidate(input: MorningBriefCandidateMarkers) {
  return enabled(input.sourceMetadata, "imported") || enabled(input.articleMetadata, "imported");
}

/** Production accepts only explicit real-source or user-import markers, never fixtures. */
export function isProductionMorningBriefCandidate(input: MorningBriefCandidateMarkers) {
  return !isMockMorningBriefCandidate(input) && (isLivePublicMorningBriefCandidate(input) || isImportedMorningBriefCandidate(input));
}

export function productionMorningBriefCandidates<T extends MorningBriefCandidateMarkers>(candidates: readonly T[]) {
  return candidates.filter(isProductionMorningBriefCandidate);
}
