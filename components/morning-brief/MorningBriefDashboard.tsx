"use client";

import { useState } from "react";
import { BriefCategoryTabs } from "@/components/morning-brief/BriefCategoryTabs";
import { MorningBriefHeader } from "@/components/morning-brief/MorningBriefHeader";
import { MarketPulse } from "@/components/morning-brief/MarketPulse";
import { MorningSummary } from "@/components/morning-brief/MorningSummary";
import { StoryFeed } from "@/components/morning-brief/StoryFeed";
import { MockBriefGenerator } from "@/components/morning-brief/MockBriefGenerator";
import { categoryTabs, feedByCategory, type BriefCategory, type MorningBriefStory } from "@/components/morning-brief/mock-data";

export function MorningBriefDashboard({ persisted }: { persisted?: Partial<Record<string, MorningBriefStory[]>> | null }) { const [activeCategory, setActiveCategory] = useState<BriefCategory>("top5"); const active = categoryTabs.find((tab) => tab.id === activeCategory)!; const key = activeCategory === "top5" ? "top_5" : activeCategory === "em-frontier" ? "emerging_frontier" : activeCategory === "vc-pe" ? "vc_pe" : activeCategory; const stories = persisted?.[key] ?? feedByCategory[activeCategory]; return <div className="mx-auto max-w-4xl space-y-7 pb-8"><div className="flex justify-end"><MockBriefGenerator /></div><MorningBriefHeader /><MarketPulse /><MorningSummary /><BriefCategoryTabs active={activeCategory} onChange={setActiveCategory} /><StoryFeed category={activeCategory} title={active.title} subtitle={active.subtitle} stories={stories} /></div>; }
