"use client";

import { useState } from "react";
import { BriefCategoryTabs } from "@/components/morning-brief/BriefCategoryTabs";
import { MorningBriefHeader } from "@/components/morning-brief/MorningBriefHeader";
import { MarketPulse } from "@/components/morning-brief/MarketPulse";
import { MorningSummary } from "@/components/morning-brief/MorningSummary";
import { StoryFeed } from "@/components/morning-brief/StoryFeed";
import { categoryTabs, feedByCategory, type BriefCategory } from "@/components/morning-brief/mock-data";

export function MorningBriefDashboard() { const [activeCategory, setActiveCategory] = useState<BriefCategory>("top5"); const active = categoryTabs.find((tab) => tab.id === activeCategory)!; return <div className="mx-auto max-w-4xl space-y-7 pb-8"><MorningBriefHeader /><MarketPulse /><MorningSummary /><BriefCategoryTabs active={activeCategory} onChange={setActiveCategory} /><StoryFeed category={activeCategory} title={active.title} subtitle={active.subtitle} stories={feedByCategory[activeCategory]} /></div>; }
