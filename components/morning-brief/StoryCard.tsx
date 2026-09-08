"use client";

import { useState } from "react";
import { ExternalLink, Heart } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { MorningBriefStory } from "@/components/morning-brief/mock-data";

export function StoryCard({ story, variant = "default" }: { story: MorningBriefStory; variant?: "default" | "featured" | "compact" | "longRead" }) {
  const [liked, setLiked] = useState(false);
  return <Card className={cn("flex h-full flex-col", variant === "featured" && "border-accent/30 bg-accent-subtle/30", variant === "longRead" && "bg-sand-100/60")} hoverable>
    <div className="flex items-start justify-between gap-3"><p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">{story.source} <span aria-hidden>·</span> {story.publishedLabel}</p><Button type="button" variant="ghost" size="sm" className="-mr-2 -mt-1 h-8 w-8 px-0" aria-label={liked ? "Unlike article" : "Like article"} aria-pressed={liked} onClick={() => setLiked((value) => !value)}><Heart size={17} className={liked ? "fill-accent text-accent" : ""} /></Button></div>
    <h3 className="mt-3 font-serif text-xl leading-snug text-text-primary">{story.title}</h3>
    {story.summary && <p className="mt-3 text-sm leading-6 text-text-secondary">{story.summary}</p>}
    {story.tags && story.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{story.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>}
    {story.whyItMatters && <div className="mt-4 border-l-2 border-accent/40 pl-3"><p className="text-xs font-semibold uppercase tracking-wide text-accent-active">Why this matters</p><p className="mt-1 text-sm leading-5 text-text-secondary">{story.whyItMatters}</p></div>}
    <div className="mt-auto pt-5">{story.href ? <a href={story.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-active">Open original <ExternalLink size={14} /></a> : <span className="text-sm text-text-tertiary">Source link coming soon</span>}</div>
  </Card>;
}
