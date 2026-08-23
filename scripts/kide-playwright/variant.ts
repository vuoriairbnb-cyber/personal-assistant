export function findExactVariantName(visibleNames: string[], target: string): string | null {
  const normalizedTarget = target.trim();
  return visibleNames.find((name) => name.trim() === normalizedTarget) ?? null;
}
