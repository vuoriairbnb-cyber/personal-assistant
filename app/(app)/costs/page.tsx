import { getCostLogs } from "@/lib/trips/queries";
import { Card } from "@/components/ui/Card";
import { CostBadge } from "@/components/ai/CostBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCostUsd, formatDateTime } from "@/lib/utils/format";

export default async function CostsPage() {
  const logs = await getCostLogs(200);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayCost = logs
    .filter((l) => new Date(l.created_at) >= startOfDay)
    .reduce((s, l) => s + l.estimated_cost_usd, 0);
  const monthCost = logs
    .filter((l) => new Date(l.created_at) >= startOfMonth)
    .reduce((s, l) => s + l.estimated_cost_usd, 0);
  const totalCost = logs.reduce((s, l) => s + l.estimated_cost_usd, 0);

  const byFeature = new Map<string, number>();
  for (const log of logs) {
    byFeature.set(log.feature, (byFeature.get(log.feature) ?? 0) + log.estimated_cost_usd);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-text-primary">AI costs</h1>
        <p className="mt-1 text-text-secondary">
          Every Claude API call this app makes, logged as it happens.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Today</p>
          <p className="mt-2 font-mono text-2xl text-text-primary">{formatCostUsd(todayCost)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            This month
          </p>
          <p className="mt-2 font-mono text-2xl text-text-primary">{formatCostUsd(monthCost)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">All time</p>
          <p className="mt-2 font-mono text-2xl text-text-primary">{formatCostUsd(totalCost)}</p>
        </Card>
      </div>

      {byFeature.size > 0 && (
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Cost per feature
          </p>
          <div className="mt-3 space-y-2">
            {[...byFeature.entries()].map(([feature, cost]) => (
              <div key={feature} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{feature.replaceAll("_", " ")}</span>
                <span className="font-mono text-text-secondary">{formatCostUsd(cost)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-text-primary">Recent calls</h2>
        {logs.length === 0 ? (
          <EmptyState
            title="No AI calls yet"
            description="Costs appear here as soon as you run an AI action on a trip."
          />
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border-subtle bg-card p-3"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {log.feature.replaceAll("_", " ")}
                  </p>
                  <p className="font-mono text-xs text-text-tertiary">
                    {formatDateTime(log.created_at)}
                  </p>
                </div>
                <CostBadge
                  model={log.model}
                  inputTokens={log.input_tokens}
                  outputTokens={log.output_tokens}
                  estimatedCostUsd={log.estimated_cost_usd}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
