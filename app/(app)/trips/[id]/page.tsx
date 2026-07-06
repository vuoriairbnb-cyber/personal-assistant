import { notFound } from "next/navigation";
import { getTripWithOutputs } from "@/lib/trips/queries";
import { TripHeader } from "@/components/trips/TripHeader";
import { EditTripDialog } from "@/components/trips/EditTripDialog";
import { DeleteTripButton } from "@/components/trips/DeleteTripButton";
import { TripWorkspace } from "@/components/trips/TripWorkspace";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getTripWithOutputs(id);

  if (!result) notFound();

  const { trip, outputs } = result;

  return (
    <div className="space-y-8">
      <TripHeader
        trip={trip}
        actions={
          <>
            <EditTripDialog trip={trip} />
            <DeleteTripButton tripId={trip.id} />
          </>
        }
      />
      <TripWorkspace trip={trip} outputs={outputs} />
    </div>
  );
}
