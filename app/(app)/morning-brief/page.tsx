import { MorningBriefDashboard } from "@/components/morning-brief/MorningBriefDashboard";
import { getMorningBriefForUser } from "@/lib/morning-brief/queries";
import { getMarketPulse } from "@/lib/morning-brief/market-pulse";
import { getDailyIntelligenceForCurrentUser } from "@/lib/morning-brief/daily-intelligence";

export const metadata = { title: "Morning Brief — Personal Assistant" };
export const maxDuration = 60;

export default async function MorningBriefPage() {
  const [persisted, marketQuotes, daily] = await Promise.all([getMorningBriefForUser(), getMarketPulse(), getDailyIntelligenceForCurrentUser()]);
  return <MorningBriefDashboard persisted={persisted?.sections ?? null} briefMeta={persisted ? { date: persisted.brief.brief_date, generatedAt: persisted.brief.generated_at } : null} marketQuotes={marketQuotes} daily={daily} />;
}
