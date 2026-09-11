import type { MorningBriefContentType } from "../taxonomy";

export type SourceCandidate = {
  sourceSlug: string;
  sourceArticleId: string;
  title: string;
  canonicalUrl: string;
  excerpt: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  categories: string[];
  imageUrl?: string;
  language: string;
  contentType?: MorningBriefContentType;
  rawMetadata: Record<string, unknown>;
};

export type MorningBriefFeedConfig = {
  id: string;
  sourceSlug: "yle" | "bank-of-finland" | "ecb";
  sourceName: string;
  sourceType: "rss" | "official";
  url: string;
  language: string;
  enabled: boolean;
  maxItems: number;
  description: string;
};

export type SourceFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface MorningBriefSourceAdapter {
  readonly sourceSlug: MorningBriefFeedConfig["sourceSlug"];
  fetchCandidates(fetcher?: SourceFetch): Promise<SourceCandidate[]>;
}

export type SourceIngestionSummary = {
  source: string;
  fetched: number;
  parsed: number;
  considered: number;
  filtered: number;
  new: number;
  duplicates: number;
  classified: number;
  reusedClassifications: number;
  embedded: number;
  reusedEmbeddings: number;
  failed: number;
  error?: string;
};
