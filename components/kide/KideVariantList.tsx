import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { KideVariant } from "@/lib/kide/types";

function formatPrice(price: number | null, currency: string | null) {
  if (price === 0) return "Free";
  if (price === null || !currency) return "Price unavailable";
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency }).format(price / 100);
}

function status(variant: KideVariant) {
  if (variant.salesEnded) return "Sales ended";
  if (!variant.salesStarted) return "Waiting for sale";
  if (!variant.salesOngoing) return "Not currently on sale";
  return variant.availability !== null && variant.availability <= 0 ? "Sold out" : "Available";
}

export function KideVariantList({ variants }: { variants: KideVariant[] }) {
  return <div className="space-y-3">{variants.map((variant) => <Card key={variant.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium text-text-primary">{variant.name}</h3><p className="mt-1 text-sm text-text-secondary">{formatPrice(variant.pricePerItem, variant.currencyCode)}</p></div><Badge tone={status(variant) === "Available" ? "success" : "neutral"}>{status(variant)}</Badge></div>
    {variant.availability !== null && <p className="mt-3 text-sm text-text-secondary">Availability value: {variant.availability}</p>}
    <div className="mt-3 flex flex-wrap gap-2">{variant.membershipRequired && <Badge tone="warning">Requires membership</Badge>}{variant.hakaRequired && <Badge tone="warning">Requires Haka authentication</Badge>}{variant.studentCardRequired && <Badge tone="warning">Requires student card</Badge>}</div>
  </Card>)}</div>;
}
