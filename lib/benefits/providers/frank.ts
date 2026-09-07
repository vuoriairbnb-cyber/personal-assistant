import { htmlToPlainText } from "../html.ts";
import type { BenefitProvider, BenefitRedemptionType, NormalizedBenefit } from "../types.ts";

const OFFERS_URL = "https://api.frankstudents.com/offers";
const REVALIDATE_SECONDS = 4 * 60 * 60;
const PAGE_SIZE = 20;
const PAGE_CONCURRENCY = 4;

type RawFrankOffer = {
  advertiser?: unknown; shownToStudents?: unknown; shownToAlumni?: unknown; smallSquareImage?: unknown; largeSquareImage?: unknown; smallImage?: unknown; largeImage?: unknown;
  hasDiscountCode?: unknown; description?: unknown; shortDescription?: unknown; url?: unknown; branchLink?: unknown; offerType?: unknown; singleUse?: unknown;
  primaryCategory?: unknown; categories?: unknown; validUntil?: unknown; discountType?: unknown; locations?: unknown; lastModified?: unknown; key?: unknown; slug?: unknown;
};
type FrankResponse = { data?: unknown; meta?: { pagination?: { totalPages?: unknown } } };

function string(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }
function date(value: unknown): string | null { const raw = string(value); return raw && Number.isFinite(Date.parse(raw)) ? new Date(raw).toISOString() : null; }
function bool(value: unknown): boolean { return value === true; }
function numericIds(value: unknown): string[] { return Array.isArray(value) ? value.flatMap(numericIds) : typeof value === "number" || typeof value === "string" ? [String(value)] : []; }
function locationNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(locationNames);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (!value || typeof value !== "object") return [];
  const location = value as Record<string, unknown>;
  return [location.name, location.city, location.cityName, location.title, location.address, location.streetAddress].flatMap((item) => typeof item === "string" && item.trim() ? [item.trim()] : []);
}
function unique(values: string[]): string[] { return [...new Set(values)]; }
function pages(payload: unknown): { offers: RawFrankOffer[]; totalPages: number } {
  const response = (payload && typeof payload === "object" ? payload : {}) as FrankResponse;
  const totalPages = response.meta?.pagination?.totalPages;
  return { offers: Array.isArray(response.data) ? response.data.filter((item): item is RawFrankOffer => Boolean(item && typeof item === "object")) : [], totalPages: typeof totalPages === "number" && Number.isInteger(totalPages) && totalPages > 0 ? totalPages : 1 };
}
function diagnostic(message: string, details?: Record<string, number | boolean>) { console.info(`[frank] ${message}`, details ?? ""); }

export function frankRedemption(offer: RawFrankOffer): { type: BenefitRedemptionType; url: string | null; notice: string | null } {
  const branchLink = string(offer.branchLink); const url = string(offer.url); const hasDiscountCode = bool(offer.hasDiscountCode); const singleUse = bool(offer.singleUse);
  if (hasDiscountCode) return { type: "provider_app", url: branchLink ?? url, notice: "Alennuskoodi saatavilla Frankin kautta." };
  if (singleUse) return { type: "provider_app", url: branchLink ?? url, notice: "Kertaetu lunastetaan Frankissa." };
  if (branchLink) return { type: "provider_app", url: branchLink, notice: null };
  if (url) return { type: "provider_link", url, notice: null };
  return { type: "unknown", url: null, notice: null };
}

export function normalizeFrankLocations(value: unknown): string[] { return unique(locationNames(value)); }

export function normalizeFrankOffer(raw: RawFrankOffer): NormalizedBenefit | null {
  const advertiser = string(raw.advertiser); const slug = string(raw.slug); const url = string(raw.url); const externalId = string(raw.key) ?? slug ?? url;
  if (!advertiser || !externalId || !bool(raw.shownToStudents)) return null;
  const title = string(raw.shortDescription) ?? advertiser; const description = htmlToPlainText(raw.description); const locations = normalizeFrankLocations(raw.locations); const categories = unique(numericIds(raw.categories)); const primaryCategory = typeof raw.primaryCategory === "number" || typeof raw.primaryCategory === "string" ? String(raw.primaryCategory) : null; const redemption = frankRedemption(raw);
  return { provider: "frank", externalId, title, heading: advertiser === title ? null : advertiser, description, providerCategory: categories.join(", ") || primaryCategory, normalizedCategory: null, offerer: advertiser, locations, restrictions: redemption.notice, benefitText: null, redemptionType: redemption.type, redemptionCode: null, redemptionUrl: redemption.url, sourceUrl: url, imageUrl: string(raw.largeImage) ?? string(raw.smallImage) ?? string(raw.largeSquareImage) ?? string(raw.smallSquareImage), validFrom: null, validUntil: date(raw.validUntil), unionId: null, unionName: null, isGeneralBenefit: true, isRecommended: false, providerMetadata: { advertiser, offerType: raw.offerType ?? null, discountType: string(raw.discountType), singleUse: bool(raw.singleUse), hasDiscountCode: bool(raw.hasDiscountCode), shownToStudents: true, shownToAlumni: bool(raw.shownToAlumni), primaryCategory, categoryIds: categories, branchLink: string(raw.branchLink) }, searchText: [advertiser, title, description, ...locations].filter(Boolean).join(" ").toLocaleLowerCase("fi-FI") };
}

function urlForPage(page: number): string { const params = new URLSearchParams({ includeJobs: "false", languageCode: "fi", page: String(page), size: String(PAGE_SIZE), sort: "date:desc" }); return `${OFFERS_URL}?${params}`; }
async function fetchPage(page: number, fetcher: typeof fetch): Promise<{ offers: RawFrankOffer[]; totalPages: number }> { const response = await fetcher(urlForPage(page), { next: { revalidate: REVALIDATE_SECONDS } }); diagnostic("HTTP status", { page, status: response.status }); if (!response.ok) throw new Error(`Frank catalog request failed (${response.status})`); return pages(await response.json()); }
async function fetchRemaining(pageNumbers: number[], fetcher: typeof fetch): Promise<RawFrankOffer[]> { const results: RawFrankOffer[] = []; for (let offset = 0; offset < pageNumbers.length; offset += PAGE_CONCURRENCY) { const batch = await Promise.all(pageNumbers.slice(offset, offset + PAGE_CONCURRENCY).map((page) => fetchPage(page, fetcher))); results.push(...batch.flatMap((page) => page.offers)); } return results; }

export async function fetchFrankBenefits(fetcher: typeof fetch = fetch): Promise<NormalizedBenefit[]> {
  diagnostic("provider start"); const first = await fetchPage(1, fetcher); const remaining = await fetchRemaining(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_value, index) => index + 2), fetcher); const offers = [...first.offers, ...remaining]; const deduplicated = new Map<string, RawFrankOffer>();
  for (const offer of offers) { const key = string(offer.key) ?? string(offer.slug) ?? string(offer.url); if (key) deduplicated.set(key, offer); }
  diagnostic("pages fetched", { count: first.totalPages }); diagnostic("offers received", { count: deduplicated.size }); const normalized = [...deduplicated.values()].map(normalizeFrankOffer).filter((benefit): benefit is NormalizedBenefit => Boolean(benefit)); const active = normalized.filter((benefit) => !benefit.validUntil || Date.parse(benefit.validUntil) >= Date.now()); diagnostic("normalized benefits", { count: normalized.length }); diagnostic("active benefits", { count: active.length }); return active;
}

export const frankProvider: BenefitProvider = { id: "frank", listBenefits: () => fetchFrankBenefits() };
