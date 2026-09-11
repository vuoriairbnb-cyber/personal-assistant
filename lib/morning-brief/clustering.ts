import { calculateFreshness, calculateSourceFit, corroborationFromSources, rankArticles, type RankingArticle, type RankingResult } from "./ranking";

export const CLUSTERING_VERSION = "clustering-v1";
export const CLUSTER_TIME_WINDOW_HOURS = { breaking_news: 36, news: 36, analysis: 96, opinion: 96, explainer: 120, long_read: 168 } as const;

export type RelatedCoverage = { articleId: string; source: string; title: string; contentType: RankingArticle["contentType"]; publishedAt: string; url?: string; relationType: "primary" | "same_event" | "analysis" | "local_perspective" | "follow_up" };
export type RankedStoryCluster = { id: string; primaryArticleId: string; articleIds: string[]; headline: string; summary: string; countries: string[]; categories: string[]; topics: string[]; sectors: string[]; firstPublishedAt: string; latestPublishedAt: string; sourceCount: number; primarySource: string; displayImageUrl?: string | null; displayImageAlt?: string | null; displayImageSource?: string | null; relatedCoverage: RelatedCoverage[]; article: RankingArticle; score: RankingResult };

const uniq = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const normalized = (value: string) => value.normalize("NFKD").toLowerCase().replace(/[’'`´]/g, "'").replace(/^\s*(breaking|update|live)\s*:\s*/i, "").replace(/\s+[|–-]\s+[^|–-]{2,40}$/u, "").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim().replace(/\s+(reuters|financial times|bbc|yle|kauppalehti|talouselämä)$/u, "");
export const normalizeTitle = normalized;
const same = (left: string[], right: string[]) => left.some((value) => right.map((item) => item.toLowerCase()).includes(value.toLowerCase()));
const hoursBetween = (a: RankingArticle, b: RankingArticle) => Math.abs(new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()) / 3_600_000;
const relationWindow = (a: RankingArticle, b: RankingArticle) => Math.max(CLUSTER_TIME_WINDOW_HOURS[a.contentType], CLUSTER_TIME_WINDOW_HOURS[b.contentType]);

/** Conservative deterministic event evidence: never clusters on country alone. */
export function articlesRepresentSameStory(a: RankingArticle, b: RankingArticle) {
  if (a.id === b.id) return true;
  if (a.canonicalUrl && b.canonicalUrl && a.canonicalUrl === b.canonicalUrl) return true;
  if (normalized(a.title) === normalized(b.title)) return true;
  if (hoursBetween(a, b) > relationWindow(a, b)) return false;
  if (a.eventKey && b.eventKey && a.eventKey === b.eventKey) return true;
  const sameEventType = Boolean(a.eventType && b.eventType && a.eventType === b.eventType);
  const sharedCountries = same(a.countries, b.countries);
  const sharedTopics = same(a.topics, b.topics);
  const sharedCompanies = same(a.companies, b.companies);
  return sameEventType && sharedCountries && (sharedTopics || sharedCompanies);
}

function relationType(article: RankingArticle, primary: RankingArticle): RelatedCoverage["relationType"] {
  if (article.id === primary.id) return "primary";
  if (article.contentType === "analysis" || article.contentType === "long_read" || article.contentType === "explainer") return "analysis";
  if (article.source.toLowerCase().includes("vietnam") || article.source.toLowerCase().includes("yle") || article.source.toLowerCase().includes("kauppalehti") || article.source.toLowerCase().includes("talouselämä")) return "local_perspective";
  return "same_event";
}

function primaryScore(article: RankingArticle, now: Date) {
  const reporting = article.contentType === "breaking_news" ? 20 : article.contentType === "news" ? 16 : article.contentType === "analysis" ? 10 : 7;
  return calculateSourceFit(article) * 0.5 + calculateFreshness(article, now) * 0.25 + article.significance * 0.2 + reporting;
}
function choosePrimary(articles: readonly [RankingArticle, ...RankingArticle[]], now: Date) { return [...articles].sort((a, b) => primaryScore(b, now) - primaryScore(a, now) || a.id.localeCompare(b.id))[0]!; }

export function clusterArticles(articles: RankingArticle[], now: Date): RankedStoryCluster[] {
  const ordered = [...articles].sort((a, b) => a.id.localeCompare(b.id));
  const parent = ordered.map((_, index) => index);
  const root = (index: number): number => parent[index]! === index ? index : (parent[index] = root(parent[index]!));
  const join = (a: number, b: number) => { const ar = root(a); const br = root(b); if (ar !== br) parent[br] = ar; };
  for (let i = 0; i < ordered.length; i += 1) for (let j = i + 1; j < ordered.length; j += 1) if (articlesRepresentSameStory(ordered[i]!, ordered[j]!)) join(i, j);
  const groups = new Map<number, RankingArticle[]>();
  ordered.forEach((article, index) => { const key = root(index); groups.set(key, [...(groups.get(key) ?? []), article]); });
  const drafts = [...groups.values()].filter((group): group is [RankingArticle, ...RankingArticle[]] => group.length > 0).map((group) => {
    const primary = choosePrimary(group, now); const sourceCount = new Set(group.map((article) => article.source.toLowerCase())).size;
    const aggregate: RankingArticle = { ...primary, countries: uniq(group.flatMap((article) => article.countries)), regions: uniq(group.flatMap((article) => article.regions)), categories: uniq(group.flatMap((article) => article.categories)), topics: uniq(group.flatMap((article) => article.topics)), sectors: uniq(group.flatMap((article) => article.sectors)), companies: uniq(group.flatMap((article) => article.companies)), significance: Math.max(...group.map((article) => article.significance)), consequence: Math.max(...group.map((article) => article.consequence)), scope: Math.max(...group.map((article) => article.scope)), sourceCount, corroboration: corroborationFromSources(group.length, sourceCount), publishedAt: group.reduce((latest, article) => new Date(latest.publishedAt) > new Date(article.publishedAt) ? latest : article).publishedAt };
    return { group, primary, aggregate, sourceCount };
  });
  const ranked = rankArticles(drafts.map((draft) => draft.aggregate), { now });
  const scores = new Map(ranked.map((result) => [result.article.id, result]));
  return drafts.map(({ group, primary, aggregate, sourceCount }) => {
    const image = [primary, ...group.filter((article) => article.id !== primary.id)].find((article) => article.imageUrl);
    const relatedCoverage = [...group].sort((a, b) => a.id.localeCompare(b.id)).map((article) => ({ articleId: article.id, source: article.source, title: article.title, contentType: article.contentType, publishedAt: article.publishedAt, ...(article.canonicalUrl ? { url: article.canonicalUrl } : {}), relationType: relationType(article, primary) }));
    return { id: `story:${group.map((article) => article.id).sort().join("+")}`, primaryArticleId: primary.id, articleIds: group.map((article) => article.id).sort(), headline: primary.title, summary: primary.summary, countries: aggregate.countries, categories: aggregate.categories, topics: aggregate.topics, sectors: aggregate.sectors, firstPublishedAt: group.reduce((first, article) => new Date(first) < new Date(article.publishedAt) ? first : article.publishedAt, group[0].publishedAt), latestPublishedAt: aggregate.publishedAt, sourceCount, primarySource: primary.source, displayImageUrl: image?.imageUrl ?? null, displayImageAlt: image?.imageAlt ?? null, displayImageSource: image?.imageSource ?? image?.source ?? null, relatedCoverage, article: aggregate, score: scores.get(aggregate.id)! };
  }).sort((a, b) => b.score.finalScore - a.score.finalScore || a.id.localeCompare(b.id));
}
