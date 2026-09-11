import { INITIAL_PORTFOLIO_LENSES } from "@/lib/morning-brief/portfolio-lenses";
import type { MorningBriefContentType, MorningBriefSection } from "@/lib/morning-brief/taxonomy";

export const RANKING_VERSION = "ranking-v1";
export const RANKING_WEIGHTS = { portfolioRelevance: 0.30, learnedPreference: 0.18, importanceScore: 0.18, explicitInterest: 0.10, freshnessScore: 0.08, sourceFit: 0.06, likedSimilarity: 0.05, noveltyScore: 0.03, explorationScore: 0.02 } as const;
export const FRESHNESS_HALF_LIFE_HOURS: Record<MorningBriefContentType, number> = { breaking_news: 15, news: 22, analysis: 36, opinion: 48, explainer: 60, long_read: 72 };

export type RankingArticle = {
  id: string; title: string; source: string; publishedAt: string; contentType: MorningBriefContentType;
  countries: string[]; regions: string[]; categories: string[]; topics: string[]; sectors: string[]; companies: string[];
  eventType?: string; eventKey?: string; canonicalUrl?: string; imageUrl?: string | null; imageAlt?: string | null; imageSource?: string | null;
  corroboration?: number; significance: number; consequence: number; scope: number; sourceCount?: number; summary: string; primarySection: MorningBriefSection;
};
export type PortfolioMatch = { lens: string; score: number; reason: string; causal?: boolean };
export type RankingResult = { article: RankingArticle; portfolioRelevance: number; learnedPreference: number; importanceScore: number; explicitInterest: number; freshnessScore: number; sourceFit: number; likedSimilarity: number; noveltyScore: number; explorationScore: number; finalScore: number; mustConsider: boolean; portfolioMatches: PortfolioMatch[]; reasons: string[] };
export type RankOptions = { now: Date; candidates?: RankingArticle[]; learnedPreference?: number; likedSimilarity?: number; semanticExplanation?: { seedCount: number; confidence: number } };

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const norm = (value: string) => value.trim().toLowerCase();
const terms = (article: RankingArticle) => new Set([article.title, ...article.countries, ...article.regions, ...article.categories, ...article.topics, ...article.sectors, ...article.companies, article.eventType ?? ""].map(norm));
const has = (values: Set<string>, phrase: string) => [...values].some((value) => value.includes(phrase));
const any = (values: Set<string>, phrases: string[]) => phrases.some((phrase) => has(values, phrase));

type LensRule = { lens: string; base: (values: Set<string>) => number; bonus: Array<{ terms: string[]; score: number; reason: string }>; causal: Array<{ terms: string[]; score: number; reason: string }> };
const LENS_RULES: LensRule[] = [
  { lens: "PYN Elite", base: (v) => has(v, "vietnam") ? 50 : 0, bonus: [{ terms: ["banking", "credit growth"], score: 46, reason: "Vietnam banking and credit cycle" }, { terms: ["property"], score: 32, reason: "Vietnam property conditions" }, { terms: ["market regulation", "market classification", "foreign investor"], score: 35, reason: "Vietnam market access and regulation" }, { terms: ["fdi", "manufacturing", "consumer", "vn-index", "currency"], score: 22, reason: "Vietnam domestic market driver" }], causal: [{ terms: ["state bank of vietnam"], score: 30, reason: "State Bank policy affects Vietnamese lending" }] },
  { lens: "Evli Emerging Frontier", base: (v) => any(v, ["emerging markets", "frontier markets", "emerging", "frontier"]) ? 48 : 0, bonus: [{ terms: ["market classification", "index inclusion", "market access", "foreign investor accessibility"], score: 42, reason: "Market classification and accessibility" }, { terms: ["capital flows", "local currencies", "currency", "local equity"], score: 26, reason: "Emerging-market flows or currency conditions" }], causal: [{ terms: ["central bank"], score: 18, reason: "Central-bank policy affects local market conditions" }] },
  { lens: "European High Yield", base: (v) => any(v, ["european high yield", "credit spreads", "leveraged finance", "high yield"]) ? 55 : 0, bonus: [{ terms: ["refinancing", "maturity wall", "default", "distressed", "restructuring", "bond issuance", "ratings"], score: 35, reason: "European credit and refinancing conditions" }], causal: [{ terms: ["ecb", "euribor", "funding costs", "rates"], score: 38, reason: "Rates affect European high-yield funding costs" }] },
  { lens: "Nordic High Yield", base: (v) => has(v, "nordic credit") || (any(v, ["sweden", "norway", "finland", "denmark"]) && any(v, ["bond", "refinancing", "default", "issuance", "covenant", "maturity extension"])) ? 58 : 0, bonus: [{ terms: ["refinancing", "default", "restructuring", "covenant", "maturity extension"], score: 34, reason: "Nordic credit event" }, { terms: ["swedish property", "norwegian energy", "shipping issuer", "sponsor-backed"], score: 25, reason: "Nordic high-yield sector exposure" }], causal: [{ terms: ["oil"], score: 25, reason: "Oil affects Norwegian energy borrowers" }, { terms: ["property valuations"], score: 28, reason: "Property values affect Swedish property borrowers" }, { terms: ["finland politics", "fiscal policy", "public finances"], score: 48, reason: "Finnish fiscal conditions affect Nordic corporate funding" }] },
  { lens: "Evli Nordic Secured Loan", base: (v) => any(v, ["syndicated loan", "secured loan", "senior secured", "leveraged loan", "private credit"]) ? 65 : 0, bonus: [{ terms: ["covenant", "collateral", "amendment", "restructuring", "refinancing", "floating-rate"], score: 28, reason: "Secured-loan structure or refinancing" }], causal: [{ terms: ["euribor"], score: 30, reason: "Euribor affects floating-rate debt" }, { terms: ["nordic refinancing"], score: 24, reason: "Nordic refinancing affects loan borrowers" }] },
];

const sourceFitRules: Record<string, Partial<Record<MorningBriefSection, number>>> = {
  reuters: { markets: 95, world: 95, emerging_frontier: 94, vietnam: 88, credit: 85 },
  "financial times": { markets: 96, credit: 96, vc_pe: 96, world: 88, worth_reading: 95 },
  yle: { finland: 96, politics: 96 }, kauppalehti: { finland: 92, markets: 86 }, talouselämä: { finland: 91, vc_pe: 88, worth_reading: 86 },
  bbc: { world: 88, politics: 90 }, "the economist": { worth_reading: 97, world: 90, politics: 89, markets: 86 },
  "vietnam business daily": { vietnam: 88 }, "nordic credit monitor": { credit: 97 }, "official institution": { markets: 88, credit: 88, emerging_frontier: 88 },
  "bank of finland": { finland: 95, markets: 84, credit: 84 }, "european central bank": { markets: 94, credit: 94 },
};

function matchLens(article: RankingArticle, rule: LensRule): PortfolioMatch | null {
  const values = terms(article); let score = rule.base(values); const reasons: string[] = []; let causal = false;
  if (score > 0) for (const bonus of rule.bonus) if (any(values, bonus.terms)) { score += bonus.score; reasons.push(bonus.reason); }
  for (const relationship of rule.causal) if (any(values, relationship.terms)) { score += relationship.score; reasons.push(relationship.reason); causal = true; }
  if (rule.lens === "PYN Elite" && any(values, ["tourism", "lifestyle", "celebrity", "sports", "travel"])) score = Math.min(score, 25);
  if (!score) return null;
  return { lens: rule.lens, score: clamp(score), reason: reasons[0] ?? "Direct portfolio lens match", causal };
}

export function calculatePortfolioRelevance(article: RankingArticle) {
  const matches = LENS_RULES.map((rule) => matchLens(article, rule)).filter((match): match is PortfolioMatch => match !== null).sort((a, b) => b.score - a.score);
  const [first, second, third] = matches;
  const score = clamp((first?.score ?? 0) + (second?.score ?? 0) * 0.12 + (third?.score ?? 0) * 0.06);
  return { score, matches };
}

export function calculateImportance(article: RankingArticle) {
  const corroboration = article.corroboration ?? corroborationFromSources(article.sourceCount ?? 1);
  return clamp(article.significance * 0.35 + article.consequence * 0.30 + article.scope * 0.20 + corroboration * 0.15);
}
export function corroborationFromSources(sourceCount: number, sourceDiversity = sourceCount) {
  const byCount = sourceCount <= 1 ? 45 : sourceCount === 2 ? 65 : sourceCount === 3 ? 80 : sourceCount === 4 ? 90 : 95;
  // Repeated coverage from the same outlet is useful, but cannot claim the full multi-source signal.
  return clamp(Math.min(byCount, 45 + Math.max(0, sourceDiversity - 1) * 20));
}
export function calculateFreshness(article: RankingArticle, now: Date) { const ageHours = Math.max(0, (now.getTime() - new Date(article.publishedAt).getTime()) / 3_600_000); return clamp(100 * Math.pow(0.5, ageHours / FRESHNESS_HALF_LIFE_HOURS[article.contentType])); }
export function calculateSourceFit(article: RankingArticle) { return sourceFitRules[norm(article.source)]?.[article.primarySection] ?? (article.contentType === "long_read" || article.contentType === "analysis" ? 68 : 55); }
export function calculateExplicitInterest(article: RankingArticle) { const v = terms(article); if (any(v, ["vietnam", "pyn elite", "emerging markets", "frontier markets", "nordic credit"])) return 100; if (any(v, ["european high yield", "secured loan", "finland business", "finland politics", "venture capital", "private equity", "markets", "macro"])) return 82; if (any(v, ["geopolitics", "world business"])) return 68; return 35; }
export function calculateNovelty(article: RankingArticle, candidates: RankingArticle[]) { const key = article.categories[0] ?? article.primarySection; const count = candidates.filter((candidate) => (candidate.categories[0] ?? candidate.primarySection) === key).length; return clamp(70 - ((count - 1) / Math.max(1, candidates.length)) * 40); }
export function calculateExploration(portfolioRelevance: number, importance: number, sourceFit: number) { return clamp(portfolioRelevance < 35 && importance >= 75 && sourceFit >= 80 ? 35 : 8); }

export function scoreArticle(article: RankingArticle, options: RankOptions): RankingResult {
  const portfolio = calculatePortfolioRelevance(article); const importanceScore = calculateImportance(article); const freshnessScore = calculateFreshness(article, options.now); const sourceFit = calculateSourceFit(article); const explicitInterest = calculateExplicitInterest(article); const noveltyScore = calculateNovelty(article, options.candidates ?? [article]); const learnedPreference = options.learnedPreference ?? 50; const likedSimilarity = options.likedSimilarity ?? 50; const explorationScore = calculateExploration(portfolio.score, importanceScore, sourceFit);
  const finalScore = clamp(portfolio.score * RANKING_WEIGHTS.portfolioRelevance + learnedPreference * RANKING_WEIGHTS.learnedPreference + importanceScore * RANKING_WEIGHTS.importanceScore + explicitInterest * RANKING_WEIGHTS.explicitInterest + freshnessScore * RANKING_WEIGHTS.freshnessScore + sourceFit * RANKING_WEIGHTS.sourceFit + likedSimilarity * RANKING_WEIGHTS.likedSimilarity + noveltyScore * RANKING_WEIGHTS.noveltyScore + explorationScore * RANKING_WEIGHTS.explorationScore);
  const mustConsider = importanceScore >= 95;
  const reasons = [...portfolio.matches.map((match) => `${match.causal ? "Causal" : "Strong"} match: ${match.lens} → ${match.reason}`), explicitInterest >= 82 ? "Matches an explicit user priority" : "", `Published recently; freshness ${Math.round(freshnessScore)}`, sourceFit >= 85 ? "Source has strong contextual fit" : "", options.semanticExplanation ? "Semantically similar to articles you liked or imported" : "", mustConsider ? "Must consider: globally critical importance" : ""].filter(Boolean);
  return { article, portfolioRelevance: portfolio.score, learnedPreference, importanceScore, explicitInterest, freshnessScore, sourceFit, likedSimilarity, noveltyScore, explorationScore, finalScore, mustConsider, portfolioMatches: portfolio.matches, reasons };
}
/** Base ranking remains purely score based. Major-event inclusion belongs to the Top 5 selector. */
export function rankArticles(articles: RankingArticle[], options: Omit<RankOptions, "candidates">): RankingResult[] { return articles.map((article) => scoreArticle(article, { ...options, candidates: articles })).sort((a, b) => b.finalScore - a.finalScore || a.article.id.localeCompare(b.article.id)); }
export function formatRankingTable(results: RankingResult[], limit = 10) { return ["Rank | Score | Story | Portfolio match | Importance", "--- | --- | --- | --- | ---", ...results.slice(0, limit).map((result, index) => `${index + 1} | ${result.finalScore.toFixed(1)} | ${result.article.title} | ${result.portfolioMatches.map((match) => match.lens).join(" + ") || "—"} | ${result.importanceScore.toFixed(0)}`)].join("\n"); }
/** Development/debug-only view; normal UI never receives model or vector details. */
export function formatSemanticRankingDebug(results: RankingResult[], limit = 10) { return ["Rank | Score | Semantic | Story", "--- | --- | --- | ---", ...results.slice(0, limit).map((result, index) => `${index + 1} | ${result.finalScore.toFixed(1)} | ${result.likedSimilarity.toFixed(0)} | ${result.article.title}`)].join("\n"); }
export const portfolioLensNames = INITIAL_PORTFOLIO_LENSES.map((lens) => lens.name);
