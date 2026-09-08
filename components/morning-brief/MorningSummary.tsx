"use client";

import { ChevronDown, Zap } from "lucide-react";
import { useState } from "react";
import { morningSummary } from "@/components/morning-brief/mock-data";

export function MorningSummary() { const [expanded, setExpanded] = useState(false); return <section className="border-y border-border-subtle py-4"><div className="flex items-start gap-3"><Zap size={17} className="mt-0.5 shrink-0 text-accent" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-text-primary">Morning Brief</p><p className={`mt-1 text-sm leading-6 text-text-secondary ${expanded ? "" : "line-clamp-2"}`}>{morningSummary}</p><button type="button" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-active" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "Show less" : "Read 30 sec summary"}<ChevronDown size={15} className={expanded ? "rotate-180" : ""} /></button></div></div></section>; }
