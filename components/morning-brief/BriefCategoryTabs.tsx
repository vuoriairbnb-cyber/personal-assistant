import { Tabs } from "@/components/ui/Tabs";
import { categoryTabs, type BriefCategory } from "@/components/morning-brief/mock-data";

export function BriefCategoryTabs({ active, onChange }: { active: BriefCategory; onChange: (value: BriefCategory) => void }) { return <div className="sticky top-0 z-20 -mx-4 border-y border-border-subtle bg-canvas/95 px-4 py-1 backdrop-blur md:-mx-8 md:px-8"><Tabs items={categoryTabs.map(({ id, label }) => ({ value: id, label }))} value={active} onChange={(value) => onChange(value as BriefCategory)} className="-mb-px" /></div>; }
