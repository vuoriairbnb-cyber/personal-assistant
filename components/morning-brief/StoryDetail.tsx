"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { StoryActions } from "@/components/morning-brief/StoryActions";
import { StoryImage } from "@/components/morning-brief/StoryImage";
import { getStoryBriefing, type MorningBriefStory, type StoryCoverage } from "@/components/morning-brief/mock-data";
import type { StoryBriefing } from "@/lib/morning-brief/types";
import { normalizeStoryTakeaway } from "@/lib/morning-brief/story-briefing-display";

const contentTypeLabel: Record<StoryCoverage["contentType"], string> = {
  news: "Original reporting",
  analysis: "Analysis",
  "local-perspective": "Local perspective",
};

export function StoryDetail({ story, relatedStories, briefing: suppliedBriefing, coverage: suppliedCoverage }: { story: MorningBriefStory; relatedStories: MorningBriefStory[]; briefing?: StoryBriefing; coverage?: StoryCoverage[] }) {
  const briefing = suppliedBriefing ?? getStoryBriefing(story);
  const coverage: StoryCoverage[] = suppliedCoverage?.length ? suppliedCoverage : [
    { source: story.source, title: `Primary coverage: ${story.title}`, contentType: "news", publishedLabel: story.publishedLabel, url: story.sourceUrl },
    ...story.relatedCoverage,
  ];

  return (
    <article className="mx-auto max-w-4xl pb-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/morning-brief" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium no-underline hover:text-accent-active"><ArrowLeft size={16} />Back to Morning Brief</Link>
        <StoryActions storyId={story.id} persistable={Boolean(story.id.match(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i))} initialLiked={story.liked} initialSaved={story.saved} />
      </div>

      <div className="mt-5"><StoryImage imageUrl={story.imageUrl} imageAlt={story.imageAlt} label={story.imageLabel} tone={story.imageTone} featured /></div>
      {story.imageSource && <p className="mt-2 text-xs text-text-tertiary">Image: {story.imageSource}</p>}

      <div className="mx-auto max-w-[44rem]">
        <div className="mt-7 flex flex-wrap gap-2">{story.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
        <h1 className="mt-4 font-serif text-4xl leading-[1.05] text-text-primary sm:text-5xl">{story.title}</h1>
        <p className="mt-4 text-sm text-text-secondary">{story.source} <span aria-hidden>·</span> {story.publishedLabel} <span aria-hidden>·</span> {story.estimatedReadTime}</p>

        <section className="mt-9 border-t border-border-subtle pt-7" aria-labelledby="briefing-title">
          <h2 id="briefing-title" className="font-serif text-2xl text-text-primary">Morning Brief Intelligence</h2>
          <div className="mt-4 space-y-5 text-[1.02rem] leading-8 text-text-secondary">{briefing.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </section>

        {briefing.evidenceNote && <p className="mt-5 rounded-lg bg-sand-200/50 px-4 py-3 text-sm leading-6 text-text-secondary">Evidence note: {briefing.evidenceNote}</p>}

        <section className="mt-10 border-l-2 border-accent pl-4" aria-labelledby="why-title">
          <h2 id="why-title" className="font-serif text-2xl text-text-primary">Why this matters to you</h2>
          <div className="mt-3 space-y-4 leading-7 text-text-secondary">{briefing.whyItMatters.split(/\n\s*\n/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </section>

        <section className="mt-10" aria-labelledby="takeaways-title">
          <h2 id="takeaways-title" className="font-serif text-2xl text-text-primary">Key takeaways</h2>
          <ul className="mt-3 list-disc space-y-3 pl-5 text-sm leading-6 text-text-secondary">{briefing.keyTakeaways.map((takeaway) => <li key={takeaway} className="border-b border-border-subtle pb-3 pl-1 marker:text-accent">{normalizeStoryTakeaway(takeaway)}</li>)}</ul>
        </section>

        <section className="mt-10 border-t border-border-subtle pt-7" aria-labelledby="coverage-title">
          <h2 id="coverage-title" className="font-serif text-2xl text-text-primary">More coverage</h2>
          <p className="mt-2 text-sm text-text-secondary">Publications represented in this story cluster. Links open the original public source.</p>
          <div className="mt-3 divide-y divide-border-subtle">{coverage.map((item) => <div key={`${item.source}-${item.title}`} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="font-medium text-text-primary">{item.source}</p><p className="mt-1 text-sm text-text-secondary">{item.title}</p><p className="mt-1 text-xs text-text-tertiary">{contentTypeLabel[item.contentType]} <span aria-hidden>·</span> {item.publishedLabel}</p></div>{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:text-accent-active">Open <ExternalLink size={15} /></a>}</div>)}</div>
        </section>

        <section className="mt-10 rounded-lg bg-sand-200/50 px-5 py-5" aria-labelledby="feedback-title"><h2 id="feedback-title" className="font-serif text-xl text-text-primary">Was this useful?</h2><p className="mt-1 text-sm text-text-secondary">Feedback is kept locally in this mock UI.</p><div className="mt-3 flex gap-3"><button type="button" className="min-h-10 rounded-full border border-border-subtle px-4 text-sm font-medium hover:border-accent">♥ More like this</button><button type="button" className="min-h-10 rounded-full border border-border-subtle px-4 text-sm font-medium hover:border-accent">Not relevant</button></div></section>

        <section className="mt-12 border-t border-border-subtle pt-7" aria-labelledby="related-title"><h2 id="related-title" className="font-serif text-2xl text-text-primary">Related stories</h2><div className="mt-3 divide-y divide-border-subtle">{relatedStories.map((item) => <Link key={item.id} href={`/morning-brief/story/${item.id}`} className="block py-4 no-underline hover:text-accent"><p className="font-serif text-xl text-text-primary">{item.title}</p><p className="mt-1 text-sm text-text-secondary">{item.source} <span aria-hidden>·</span> {item.publishedLabel}</p></Link>)}</div></section>
      </div>
    </article>
  );
}
