import { isIP } from "node:net";

const TRACKING_KEYS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid"]);
export function normalizeImportUrl(input: string) {
  const url = new URL(input.trim());
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only public HTTP or HTTPS URLs are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not allowed.");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  const sorted = [...url.searchParams.entries()].sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv));
  url.search = "";
  for (const [key, value] of sorted) url.searchParams.append(key, value);
  return url.toString();
}
export function isPrivateAddress(address: string) {
  const value = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (value === "::1" || value === "0.0.0.0" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) return true;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]; const ipv4 = mapped ?? (isIP(value) === 4 ? value : null); if (!ipv4) return false;
  const parts = ipv4.split(".").map(Number); const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a !== undefined && a >= 224);
}
export function assertSafeUrlShape(input: string) {
  const normalized = normalizeImportUrl(input); const url = new URL(normalized); const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "metadata.google.internal" || host === "169.254.169.254" || (isIP(host) && isPrivateAddress(host))) throw new Error("Private or internal addresses are not allowed.");
  return normalized;
}
export const resolveSafeRedirectShape = (currentUrl: string, location: string) => assertSafeUrlShape(new URL(location, currentUrl).toString());
