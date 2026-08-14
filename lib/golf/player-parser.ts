export type PublicGolfPlayer = { firstName: string; familyName: string; dateTimeStart: string; resourceId?: number };

function normalizeName(value: string): string { return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fi-FI"); }
function isActive(status: unknown): boolean { return status === undefined || status === null || String(status).toLocaleLowerCase("fi-FI") === "active"; }

export function parsePublicGolfPlayer(value: unknown): PublicGolfPlayer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.firstName !== "string" || !row.firstName.trim() || typeof row.familyName !== "string" || !row.familyName.trim()) return null;
  if (row.namePublic !== undefined && row.namePublic !== null && row.namePublic !== 1 && row.namePublic !== true) return null;
  if (!isActive(row.status) || typeof row.dateTimeStart !== "string" || !row.dateTimeStart) return null;
  const resourceId = typeof row.resourceId === "number" ? row.resourceId : typeof row.resourceId === "string" && /^\d+$/.test(row.resourceId) ? Number(row.resourceId) : undefined;
  return { firstName: row.firstName, familyName: row.familyName, dateTimeStart: row.dateTimeStart, ...(resourceId !== undefined ? { resourceId } : {}) };
}

export function matchesPublicGolfPlayer(player: PublicGolfPlayer, firstName: string, familyName: string): boolean {
  return normalizeName(player.firstName) === normalizeName(firstName) && normalizeName(player.familyName) === normalizeName(familyName);
}

/** WiseGolf sends local tee times as `YYYY-MM-DD HH:mm:ss`; never timezone-shift them. */
export function parseWiseGolfLocalDateTime(value: string): { date: string; time: string } | null {
  const match = /^(\d{4}-\d{2}-\d{2})[ T]([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value);
  return match ? { date: match[1]!, time: `${match[2]}:${match[3]}` } : null;
}
