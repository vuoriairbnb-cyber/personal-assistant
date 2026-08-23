import { Card } from "@/components/ui/Card";

export function KideConnectionStatus({ configured }: { configured: boolean }) {
  return <Card><p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Kide connection</p><p className="mt-2 font-medium text-text-primary">{configured ? "Connected" : "Not configured"}</p><p className="mt-1 text-sm text-text-secondary">{configured ? "Server credential configured" : "KIDE_BEARER_TOKEN is missing"}</p></Card>;
}
