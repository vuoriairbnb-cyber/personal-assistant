import Link from "next/link";
import { Bookmark } from "lucide-react";
import { presentMorningBriefHeader, type MorningBriefHeaderMeta } from "@/lib/morning-brief/presentation";

export function MorningBriefHeader({ briefMeta }: { briefMeta: MorningBriefHeaderMeta | null }) {
  const presentation = presentMorningBriefHeader(briefMeta);
  return <header className="pt-1"><div className="flex items-start justify-between gap-4"><div><p className="text-base font-medium text-text-primary">Good morning <span aria-hidden>☀️</span></p><h1 className="mt-2 font-serif text-4xl leading-none text-text-primary sm:text-5xl">Morning Brief</h1></div><Link href="/morning-brief/library" className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-3 py-2 text-sm font-medium text-text-secondary no-underline hover:bg-sand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><Bookmark size={16} />Library</Link></div><p className="mt-3 text-sm text-text-secondary">{presentation.date}</p><p className="mt-1 text-sm text-text-secondary">Your personal view on what matters today.</p>{presentation.updated && <p className="mt-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">{presentation.updated}</p>}</header>;
}
