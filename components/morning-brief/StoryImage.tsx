import { cn } from "@/lib/utils/cn";
import type { StoryTone } from "@/components/morning-brief/mock-data";

const tones: Record<StoryTone, string> = { violet: "bg-accent-subtle text-accent-active", green: "bg-success-bg text-success-strong", sand: "bg-warning-bg text-warning-strong", blue: "bg-sand-200 text-text-primary", rose: "bg-danger-bg text-danger-strong" };
export function StoryImage({ label, tone, featured = false }: { label: string; tone: StoryTone; featured?: boolean }) { return <div aria-hidden className={cn("relative shrink-0 overflow-hidden rounded-md", tones[tone], featured ? "aspect-[16/8] w-full" : "h-24 w-24 sm:h-28 sm:w-32")}><div className="absolute inset-x-3 bottom-3 border-t border-current/20 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">{label}</div></div>; }
