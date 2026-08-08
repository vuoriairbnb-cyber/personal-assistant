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
      {/*
        `pl-sidebar` doesn't exist as a Tailwind class — `theme.extend.width`
        only feeds `w-*` utilities, not `pl-*` (that reads from
        `theme.spacing`/`theme.padding`). Content was rendering underneath the
        fixed sidebar at desktop widths. Arbitrary value here matches
        `w-sidebar`'s 260px directly.
      */}
      <main className="min-h-dvh pb-24 md:pb-0 md:pl-[260px]">
        <div className="mx-auto max-w-content px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
