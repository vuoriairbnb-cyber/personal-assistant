import { isCurrentMorningBriefClassificationVersion } from "./classification-contract";

export const isRecentLiveMorningBriefArticle = (publishedAt: string, now: Date, freshnessWindowHours: number) => {
  const timestamp = Date.parse(publishedAt);
  return Number.isFinite(timestamp) && timestamp >= now.getTime() - freshnessWindowHours * 3_600_000;
};

/** A hash match cannot make a legacy classifier version current. */
export const needsLiveMorningBriefClassification = (version: string | null | undefined, classifiedInputHash: unknown, currentInputHash: string) => !isCurrentMorningBriefClassificationVersion(version) || classifiedInputHash !== currentInputHash;
