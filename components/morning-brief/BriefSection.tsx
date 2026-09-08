import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StoryCard } from "@/components/morning-brief/StoryCard";
import type { MorningBriefStory } from "@/components/morning-brief/mock-data";

export function BriefSection({ title, description, stories }: { title: string; description?: string; stories: MorningBriefStory[] }) {
  return <section className="space-y-4" aria-labelledby={`morning-brief-${title}`}>
    <div className="flex items-end justify-between gap-4"><div><h2 id={`morning-brief-${title}`} className="font-serif text-2xl text-text-primary">{title}</h2>{description && <p className="mt-1 max-w-2xl text-sm text-text-secondary">{description}</p>}</div><Button type="button" variant="ghost" size="sm" disabled aria-label={`Show more ${title} stories, coming soon`}>Näytä lisää <ArrowRight size={15} /></Button></div>
    <div className="grid gap-4 md:grid-cols-2">{stories.map((story) => <StoryCard key={story.id} story={story} />)}</div>
  </section>;
}
