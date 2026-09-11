import { MorningBriefLibrary } from "@/components/morning-brief/MorningBriefLibrary";
import { getMorningBriefLibraryForUser } from "@/lib/morning-brief/queries";

export const metadata = { title: "Morning Brief Library — Personal Assistant" };
export default async function MorningBriefLibraryPage() { const library = await getMorningBriefLibraryForUser(); return <MorningBriefLibrary {...library} />; }
