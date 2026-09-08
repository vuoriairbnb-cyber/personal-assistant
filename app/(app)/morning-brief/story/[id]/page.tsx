import { notFound } from "next/navigation";
import { StoryDetail } from "@/components/morning-brief/StoryDetail";
import { getMockStory, getRelatedStories } from "@/components/morning-brief/mock-data";

export default async function MorningBriefStoryPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const story = getMockStory(id); if (!story) notFound(); return <StoryDetail story={story} relatedStories={getRelatedStories(id)} />; }
