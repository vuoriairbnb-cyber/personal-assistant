import { htmlToPlainText } from "../html.ts";
import type { BenefitProvider, BenefitRedemptionType, MemberPlusUnion, NormalizedBenefit } from "../types.ts";

const BENEFITS_URL = "https://server.dgtl.fi/memberplus/api/benefits/fi";
const UNIONS_URL = "https://server.dgtl.fi/memberplus/api/unions";
const REVALIDATE_SECONDS = 4 * 60 * 60;

type Property = { key?: unknown; value?: unknown };
type RawBenefit = { wpId?: unknown; title?: unknown; heading?: unknown; content?: unknown; service?: unknown; recommended?: unknown; itemOfferer?: unknown; itemBenefit?: unknown; itemLink?: unknown; itemStartDate?: unknown; itemEndDate?: unknown; itemCode?: unknown; extendedProperties?: unknown; url?: unknown; benefitImage?: unknown };
type RawUnion = { taxonomyId?: unknown; name?: unknown; title?: unknown };

function string(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }
function normalizedDate(value: unknown): string | null { const source = string(value); if (!source || source.startsWith("0001-01-01") || !Number.isFinite(Date.parse(source))) return null; return new Date(source).toISOString(); }
function properties(value: unknown): Property[] { return Array.isArray(value) ? value.filter((item): item is Property => Boolean(item && typeof item === "object")) : []; }
function property(values: Property[], key: string): string | null { return string(values.find((entry) => entry.key === key)?.value); }
function records(payload: unknown, key: string): unknown[] { if (Array.isArray(payload)) return payload; if (payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>)[key])) return (payload as Record<string, unknown>)[key] as unknown[]; return []; }

export function classifyMemberPlusRedemption(itemCode: string | null, itemLink: string | null): { type: BenefitRedemptionType; code: string | null; url: string | null } {
  const code = itemCode?.trim() ?? "";
  if (code && code.length <= 48 && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(code)) return { type: "code", code, url: itemLink };
  const labelledCode = /^(?:etu(?:koodi)?|code)\s*:\s*([A-Za-z0-9_-]{3,48})$/i.exec(code)?.[1];
  if (labelledCode) return { type: "code", code: labelledCode, url: itemLink };
  if (code) return { type: "instructions", code, url: itemLink };
  if (itemLink) return { type: "link", code: null, url: itemLink };
  return { type: "unknown", code: null, url: null };
}

export function normalizeMemberPlusBenefit(raw: RawBenefit, unions: Map<string, string>): NormalizedBenefit | null {
  const externalId = typeof raw.wpId === "number" || typeof raw.wpId === "string" ? String(raw.wpId) : null; const title = string(raw.title);
  if (!externalId || !title) return null;
  const props = properties(raw.extendedProperties); const unionId = property(props, "union"); const category = property(props, "categories"); const description = htmlToPlainText(raw.content); const heading = string(raw.heading); const benefitText = string(raw.itemBenefit); const itemCode = string(raw.itemCode); const itemLink = string(raw.itemLink); const redemption = classifyMemberPlusRedemption(itemCode, itemLink);
  const searchText = [title, heading, category, raw.itemOfferer, benefitText, description].filter((value): value is string => typeof value === "string").join(" ").toLocaleLowerCase("fi-FI");
  return { provider: "memberplus", externalId, title, heading, description, providerCategory: category, normalizedCategory: null, offerer: string(raw.itemOfferer), benefitText, redemptionType: redemption.type, redemptionCode: redemption.code, redemptionUrl: redemption.url, sourceUrl: string(raw.url), imageUrl: string(raw.benefitImage), validFrom: normalizedDate(raw.itemStartDate), validUntil: normalizedDate(raw.itemEndDate), unionId, unionName: unionId ? unions.get(unionId) ?? null : null, isGeneralBenefit: !unionId, isRecommended: raw.recommended === true, searchText };
}

async function fetchJson(url: string, fetcher: typeof fetch = fetch): Promise<unknown> { const response = await fetcher(url, { next: { revalidate: REVALIDATE_SECONDS } }); if (!response.ok) throw new Error(`Member+ catalog request failed (${response.status})`); return response.json(); }

export async function fetchMemberPlusUnions(fetcher: typeof fetch = fetch): Promise<MemberPlusUnion[]> {
  const payload = await fetchJson(UNIONS_URL, fetcher); const unionRecords = records(payload, "unions");
  return unionRecords.map((raw) => { const union = raw as RawUnion; const id = typeof union.taxonomyId === "number" || typeof union.taxonomyId === "string" ? String(union.taxonomyId) : null; const name = string(union.name) ?? string(union.title); return id && name ? { id, name } : null; }).filter((union): union is MemberPlusUnion => Boolean(union)).sort((a, b) => a.name.localeCompare(b.name, "fi"));
}

export async function fetchMemberPlusBenefits(fetcher: typeof fetch = fetch): Promise<NormalizedBenefit[]> {
  const [rawBenefits, unions] = await Promise.all([fetchJson(BENEFITS_URL, fetcher), fetchMemberPlusUnions(fetcher)]); const unionMap = new Map(unions.map((union) => [union.id, union.name]));
  return records(rawBenefits, "benefits").map((raw) => normalizeMemberPlusBenefit(raw as RawBenefit, unionMap)).filter((benefit): benefit is NormalizedBenefit => Boolean(benefit));
}

export const memberPlusProvider: BenefitProvider = { id: "memberplus", listBenefits: () => fetchMemberPlusBenefits() };
