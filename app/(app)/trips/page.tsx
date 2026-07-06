import { listTrips } from "@/lib/trips/queries";
import { TripCard } from "@/components/trips/TripCard";
import { NewTripDialog } from "@/components/trips/NewTripDialog";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function TripsPage() {
  const trips = await listTrips();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">Trips</h1>
          <p className="mt-1 text-text-secondary">Every trip project you&apos;re planning or operating.</p>
        </div>
        <NewTripDialog />
      </div>

      {trips.length === 0 ? (
        <EmptyState title="No trips yet" description="Paste a plan to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
