export const isCompletedImport = (status: string, linkedArticleId: string | null | undefined) => status === "completed" && Boolean(linkedArticleId);
export const shouldApplyImportSignal = (duplicate: boolean, storyId: string | null | undefined) => !duplicate && Boolean(storyId);
