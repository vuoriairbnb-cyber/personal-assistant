import { notFound } from "next/navigation";
import { StoryDetail } from "@/components/morning-brief/StoryDetail";
import { getMorningBriefStoryForUser } from "@/lib/morning-brief/queries";
import { recordMorningBriefOpen } from "@/lib/actions/morning-brief";

export default async function MorningBriefStoryPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const result = await getMorningBriefStoryForUser(id); if (!result) notFound(); await recordMorningBriefOpen(id); return <StoryDetail story={result.story} relatedStories={result.relatedStories} />; }
