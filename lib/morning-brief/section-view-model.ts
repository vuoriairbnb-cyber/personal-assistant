import type { MorningBriefStory } from "@/components/morning-brief/mock-data";
import type { MorningBriefSection } from "./taxonomy";

export type PersistedMorningBriefSections = Partial<Record<MorningBriefSection, MorningBriefStory[]>>;

/** Builds a React-serializable object rather than Object.groupBy's null-prototype result. */
export function groupMorningBriefStories(stories: readonly MorningBriefStory[]): PersistedMorningBriefSections {
  const sections: PersistedMorningBriefSections = {};

  for (const story of stories) {
    const section = story.category as MorningBriefSection;
    const current = sections[section] ?? [];
    current.push(story);
    sections[section] = current;
  }

  return sections;
}
