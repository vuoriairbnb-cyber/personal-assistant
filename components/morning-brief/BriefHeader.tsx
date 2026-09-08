import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BriefHeader() {
  return <header className="flex flex-col justify-between gap-5 border-b border-border-subtle pb-6 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-accent">Good morning</p><h1 className="mt-1 font-serif text-4xl text-text-primary sm:text-5xl">Morning Brief</h1><p className="mt-3 text-text-secondary">Tuesday, 8 September <span aria-hidden>·</span> Updated 07:15 <span aria-hidden>·</span> 8 min read</p></div><Button type="button" variant="secondary" disabled aria-label="Refresh Morning Brief, coming soon"><RefreshCw size={16} />Refresh</Button></header>;
}
