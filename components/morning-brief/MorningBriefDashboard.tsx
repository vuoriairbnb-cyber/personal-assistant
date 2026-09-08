import { BriefHeader } from "@/components/morning-brief/BriefHeader";
import { BriefSection } from "@/components/morning-brief/BriefSection";
import { StoryCard } from "@/components/morning-brief/StoryCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { marketsAtAGlance, sections, todayInThirtySeconds, whatMattersToday, worthReading } from "@/components/morning-brief/mock-data";

export function MorningBriefDashboard() {
  return <div className="space-y-10"><BriefHeader />
    <section aria-labelledby="today-in-thirty"><Card className="border-accent/25 bg-accent-subtle/30"><Badge tone="accent">Today in 30 seconds</Badge><p id="today-in-thirty" className="mt-4 max-w-4xl font-serif text-xl leading-8 text-text-primary">{todayInThirtySeconds}</p><p className="mt-3 text-sm text-text-secondary">Phase 1 mock briefing content. Live sources and ranking arrive in later phases.</p></Card></section>
    <section className="space-y-4" aria-labelledby="what-matters"><div><h2 id="what-matters" className="font-serif text-3xl text-text-primary">What Matters Today</h2><p className="mt-1 text-text-secondary">The stories with the strongest current relevance across your investment and professional lenses.</p></div><div className="grid gap-4 lg:grid-cols-2">{whatMattersToday.map((story, index) => <StoryCard key={story.id} story={story} variant={index === 0 ? "featured" : "default"} />)}</div></section>
    <section className="space-y-4" aria-labelledby="markets-glance"><div><h2 id="markets-glance" className="font-serif text-2xl text-text-primary">Markets at a Glance</h2><p className="mt-1 text-sm text-text-secondary">Illustrative market context only — not live data.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{marketsAtAGlance.map((market) => <Card key={market.label} className="p-4"><p className="text-xs font-medium text-text-tertiary">{market.label}</p><p className="mt-2 font-mono text-lg text-text-primary">{market.value}</p><p className={`mt-1 text-xs font-medium ${market.positive ? "text-success-strong" : "text-text-secondary"}`}>{market.change}</p></Card>)}</div></section>
    {sections.map((section) => <BriefSection key={section.id} {...section} />)}
    <section className="space-y-4" aria-labelledby="worth-reading"><div className="flex items-end justify-between gap-4"><div><h2 id="worth-reading" className="font-serif text-2xl text-text-primary">Worth Reading</h2><p className="mt-1 text-sm text-text-secondary">Longer, synthetic mock reading prompts for context beyond breaking news.</p></div></div><div className="grid gap-4 lg:grid-cols-3">{worthReading.map((story) => <StoryCard key={story.id} story={story} variant="longRead" />)}</div></section>
  </div>;
}
