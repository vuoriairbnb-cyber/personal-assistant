export type PublicGolfPlayer = { firstName: string; familyName: string; dateTimeStart: string; resourceId?: number };

function normalizeName(value: string): string { return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fi-FI"); }
function isActive(status: unknown): boolean { return status === undefined || status === null || String(status).toLocaleLowerCase("fi-FI") === "active"; }

export function parsePublicGolfPlayer(value: unknown): PublicGolfPlayer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.firstName !== "string" || !row.firstName.trim() || typeof row.familyName !== "string" || !row.familyName.trim()) return null;
  if (row.namePublic !== undefined && row.namePublic !== 1 && row.namePublic !== true) return null;
  if (!isActive(row.status) || typeof row.dateTimeStart !== "string" || !row.dateTimeStart) return null;
  return { firstName: row.firstName, familyName: row.familyName, dateTimeStart: row.dateTimeStart, ...(typeof row.resourceId === "number" ? { resourceId: row.resourceId } : {}) };
}

export function matchesPublicGolfPlayer(player: PublicGolfPlayer, firstName: string, familyName: string): boolean {
  return normalizeName(player.firstName) === normalizeName(firstName) && normalizeName(player.familyName) === normalizeName(familyName);
}
