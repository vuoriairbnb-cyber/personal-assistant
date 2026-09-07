import { BenefitsSearch } from "@/components/benefits/BenefitsSearch";

export const metadata = { title: "Edut — Personal Assistant" };
export default function BenefitsPage() { return <div className="space-y-6"><div><h1 className="font-serif text-3xl text-text-primary">Edut</h1><p className="mt-1 text-text-secondary">Hae Member+ -etuja. Union-kohtaiset edut näkyvät vain valitulle unionille.</p></div><BenefitsSearch /></div>; }
