import { KideConnectionStatus } from "@/components/kide/KideConnectionStatus";
import { KideEventInspector } from "@/components/kide/KideEventInspector";
import { getKideConnectionStatus } from "@/lib/kide/client";
import { getKideControlPlane } from "@/lib/kide/queries";
import { KideControlPlane } from "@/components/kide/KideControlPlane";

export const metadata = { title: "Kide — Personal Assistant" };

export default async function KidePage() {
  const { configured } = getKideConnectionStatus();
  const { device, watch } = await getKideControlPlane();
  return <div className="space-y-6"><div><h1 className="font-serif text-3xl text-text-primary">Kide</h1><p className="mt-1 text-text-secondary">Inspect Kide.app events and control your paired local reservation agent.</p></div><KideConnectionStatus configured={configured} /><KideControlPlane device={device} watch={watch} /><KideEventInspector configured={configured} /></div>;
}
