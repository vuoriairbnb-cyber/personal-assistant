"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "@/components/layout/nav-items";

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-sidebar flex-col border-r border-border-subtle bg-canvas px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-8 px-2 font-serif text-xl text-text-primary">
        Personal <span className="italic text-accent">Assistant</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-sand-200 text-text-primary"
                  : "text-text-secondary hover:bg-sand-200 hover:text-text-primary"
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {userEmail && (
        <div className="border-t border-border-subtle pt-4">
          <p className="truncate px-2 text-xs text-text-tertiary">{userEmail}</p>
        </div>
      )}
    </aside>
  );
}
