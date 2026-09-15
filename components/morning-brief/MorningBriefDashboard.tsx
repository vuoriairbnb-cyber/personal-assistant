"use client";

import { useState } from "react";
import { BriefCategoryTabs } from "@/components/morning-brief/BriefCategoryTabs";
import { MorningBriefHeader } from "@/components/morning-brief/MorningBriefHeader";
import { MarketPulse } from "@/components/morning-brief/MarketPulse";
import { DailyIntelligenceBrief } from "@/components/morning-brief/DailyIntelligenceBrief";
import { StoryFeed } from "@/components/morning-brief/StoryFeed";
import { MockBriefGenerator } from "@/components/morning-brief/MockBriefGenerator";
import { categoryTabs, feedByCategory, type BriefCategory, type MorningBriefStory } from "@/components/morning-brief/mock-data";
import type { MarketQuote } from "@/lib/morning-brief/market-pulse-contract";
import type { DailyIntelligenceFlowResult } from "@/lib/morning-brief/daily-intelligence-flow";

export function MorningBriefDashboard({ persisted, briefMeta, marketQuotes = [], daily }: { persisted?: Partial<Record<string, MorningBriefStory[]>> | null; briefMeta: { date: string; generatedAt: string } | null; marketQuotes?: MarketQuote[]; daily: DailyIntelligenceFlowResult }) { const [activeCategory, setActiveCategory] = useState<BriefCategory>("top5"); const active = categoryTabs.find((tab) => tab.id === activeCategory)!; const key = activeCategory === "top5" ? "top_5" : activeCategory === "em-frontier" ? "emerging_frontier" : activeCategory === "vc-pe" ? "vc_pe" : activeCategory; const stories = persisted?.[key] ?? feedByCategory[activeCategory]; return <div className="mx-auto max-w-4xl space-y-7 pb-8"><div className="flex justify-end"><MockBriefGenerator /></div><MorningBriefHeader briefMeta={briefMeta} /><MarketPulse quotes={marketQuotes} /><DailyIntelligenceBrief result={daily} /><BriefCategoryTabs active={activeCategory} onChange={setActiveCategory} /><StoryFeed category={activeCategory} title={active.title} subtitle={active.subtitle} stories={stories} /></div>; }
