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
  sourceSlug: string;
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
  readonly sourceSlug: string;
  fetchCandidates(fetcher?: SourceFetch): Promise<SourceCandidate[]>;
  /** Deterministic source-specific relevance check, run before persistence and AI work. */
  shouldKeepCandidate?(candidate: SourceCandidate): boolean;
}

export type SourceIngestionSummary = {
  source: string;
  fetched: number;
  parsed: number;
  considered: number;
  filtered: number;
  /** Candidates with an unusable publication timestamp. */
  invalid: number;
  /** Valid but older than the live-ingestion recency window. */
  stale: number;
  /** Recent candidates omitted before persistence because of the source scan cap. */
  outsideBatchLimit: number;
  /** Eligible candidates not inserted because the per-source new-item cap was reached. */
  skipped: number;
  new: number;
  duplicates: number;
  classified: number;
  reusedClassifications: number;
  embedded: number;
  reusedEmbeddings: number;
  failed: number;
  error?: string;
};
