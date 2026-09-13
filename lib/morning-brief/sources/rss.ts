import { createHash } from "node:crypto";
import type { SourceCandidate } from "./types";

type FeedItem = { id?: string; title?: string; link?: string; description?: string; published?: string; updated?: string; author?: string; categories: string[]; imageUrl?: string };
const decode = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&(?:amp|#38);/g, "&").replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
const element = (xml: string, name: string) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1];
const all = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "gi"))].map((match) => decode(match[1] ?? "")).filter(Boolean);
const attribute = (tag: string, name: string) => tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1];
const validDate = (value: string | undefined) => {
  const normalized = value?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  return normalized && Number.isFinite(Date.parse(normalized)) ? new Date(normalized).toISOString() : undefined;
};
const id = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 48);

function parseItem(block: string, atom: boolean): FeedItem | null {
  const title = decode(element(block, "title") ?? "");
  const linkTags = [...block.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  const link = atom ? linkTags.find((tag) => (attribute(tag, "rel") ?? "alternate") === "alternate") ?? linkTags[0] : undefined;
  const linkValue = atom ? attribute(link ?? "", "href") : decode(element(block, "link") ?? "");
  if (!title || !linkValue) return null;
  const categoryTags = [...block.matchAll(/<category\b[^>]*?(?:\/>|>[\s\S]*?<\/category>)/gi)].map((match) => match[0]);
  const categories = atom ? categoryTags.map((tag) => decode(attribute(tag, "term") ?? "")).filter(Boolean) : all(block, "category");
  const media = [...block.matchAll(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/gi)].map((match) => attribute(match[0], "url")).find(Boolean);
  const authorBlock = element(block, "author");
  return { title, link: linkValue, id: decode(element(block, atom ? "id" : "guid") ?? "") || undefined, description: decode(element(block, atom ? "summary" : "description") ?? element(block, "content") ?? ""), published: validDate(element(block, atom ? "published" : "pubDate") || element(block, "dc:date")), updated: validDate(element(block, "updated")), author: decode(atom ? element(authorBlock ?? "", "name") ?? "" : element(block, "dc:creator") ?? "") || undefined, categories, imageUrl: media };
}

export function parseRssOrAtom(xml: string): FeedItem[] {
  const atom = /<feed\b/i.test(xml); const blocks = atom ? [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map((match) => match[1] ?? "") : [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => match[1] ?? "");
  return blocks.map((block) => parseItem(block, atom)).filter((item): item is FeedItem => Boolean(item));
}

export function rssCandidates(xml: string, config: { sourceSlug: SourceCandidate["sourceSlug"]; language: string; feedUrl: string; maxItems: number }): SourceCandidate[] {
  return parseRssOrAtom(xml).slice(0, config.maxItems).flatMap((item) => {
    try {
      const canonicalUrl = new URL(item.link!, config.feedUrl).toString(); const sourceArticleId = item.id || id(canonicalUrl);
      return [{ sourceSlug: config.sourceSlug, sourceArticleId, title: item.title!, canonicalUrl, excerpt: item.description ?? "", publishedAt: item.published ?? item.updated ?? new Date(0).toISOString(), updatedAt: item.updated, author: item.author, categories: item.categories, imageUrl: item.imageUrl, language: config.language, rawMetadata: { feed_url: config.feedUrl, guid: item.id ?? null, categories: item.categories } }];
    } catch { return []; }
  });
}
