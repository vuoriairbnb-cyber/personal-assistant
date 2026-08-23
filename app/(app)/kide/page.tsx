import { KideConnectionStatus } from "@/components/kide/KideConnectionStatus";
import { KideEventInspector } from "@/components/kide/KideEventInspector";
import { getKideConnectionStatus } from "@/lib/kide/client";

export const metadata = { title: "Kide — Personal Assistant" };

export default function KidePage() {
  const { configured } = getKideConnectionStatus();
  return <div className="space-y-6"><div><h1 className="font-serif text-3xl text-text-primary">Kide</h1><p className="mt-1 text-text-secondary">Inspect Kide.app events and prepare ticket watches.</p></div><KideConnectionStatus configured={configured} /><KideEventInspector configured={configured} /></div>;
}
