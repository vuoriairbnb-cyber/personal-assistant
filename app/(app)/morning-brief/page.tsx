import { MorningBriefDashboard } from "@/components/morning-brief/MorningBriefDashboard";
import { getMorningBriefForUser } from "@/lib/morning-brief/queries";

export const metadata = { title: "Morning Brief — Personal Assistant" };

export default async function MorningBriefPage() {
  const persisted = await getMorningBriefForUser();
  return <MorningBriefDashboard persisted={persisted?.sections ?? null} />;
}
