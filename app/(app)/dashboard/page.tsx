import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { TripCard } from "@/components/trips/TripCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { listTrips, getCostLogs } from "@/lib/trips/queries";
import { formatCostUsd } from "@/lib/utils/format";

export default async function DashboardPage() {
  const [trips, costLogs] = await Promise.all([listTrips(), getCostLogs(200)]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayCost = costLogs
    .filter((log) => new Date(log.created_at) >= startOfDay)
    .reduce((sum, log) => sum + log.estimated_cost_usd, 0);

  const monthCost = costLogs
    .filter((log) => new Date(log.created_at) >= startOfMonth)
    .reduce((sum, log) => sum + log.estimated_cost_usd, 0);

  const recentTrips = trips.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-text-primary">Dashboard</h1>
        <p className="mt-1 text-text-secondary">Your personal operating system, at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Active trips
          </p>
          <p className="mt-2 font-serif text-3xl text-text-primary">{trips.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            AI spend today
          </p>
          <p className="mt-2 font-mono text-2xl text-text-primary">{formatCostUsd(todayCost)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            AI spend this month
          </p>
          <p className="mt-2 font-mono text-2xl text-text-primary">{formatCostUsd(monthCost)}</p>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-text-primary">Recent trips</h2>
          <ButtonLink href="/trips" variant="ghost">
            View all
          </ButtonLink>
        </div>

        {recentTrips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Paste a plan to get started."
            action={
              <ButtonLink href="/trips">
                <Plus size={16} strokeWidth={1.75} />
                New trip
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
