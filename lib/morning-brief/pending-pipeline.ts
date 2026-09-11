export type PendingWork = { id: string; classificationCurrent: boolean; embeddingCurrent: boolean };

export const needsMorningBriefProcessing = (item: PendingWork) => !item.classificationCurrent || !item.embeddingCurrent;
export const selectMorningBriefPendingBatch = <T>(items: readonly T[], batchSize: number) => items.slice(0, Math.max(0, batchSize));
export const remainingMorningBriefWork = <T extends { id: string }>(items: readonly T[], completedIds: ReadonlySet<string>) => items.filter((item) => !completedIds.has(item.id));
export const canRegenerateMorningBrief = ({ fetching, processing }: { fetching: boolean; processing: boolean }) => !fetching && !processing;
