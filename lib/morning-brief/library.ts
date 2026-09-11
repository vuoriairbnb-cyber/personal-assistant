export function importedArticleIds(rows: Array<{ status: string; linkedArticleId?: string | null }>) {
  return [...new Set(rows.filter((row) => row.status === "completed").map((row) => row.linkedArticleId).filter((id): id is string => Boolean(id)))];
}
export function importedArticleIdsForUser(rows: Array<{ userId: string; status: string; linkedArticleId?: string | null }>, userId: string) { return importedArticleIds(rows.filter((row) => row.userId === userId)); }
