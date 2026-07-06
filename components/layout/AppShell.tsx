import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabs } from "@/components/layout/BottomTabs";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <Sidebar userEmail={userEmail} />
      <BottomTabs />
      <main className="min-h-dvh pb-24 md:pb-0 md:pl-sidebar">
        <div className="mx-auto max-w-content px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
