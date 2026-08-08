"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "@/components/layout/nav-items";

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const displayName = userEmail?.split("@")[0] ?? "Your account";

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-sidebar flex-col rounded-r-[28px] border-r border-border-subtle bg-card px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2 no-underline">
        <span
          aria-hidden
          className="h-9 w-9 shrink-0 rounded-full bg-[conic-gradient(from_140deg,#6D4CFF,#3BA9F5,#22C08A,#FFB020,#6D4CFF)]"
        />
        <span className="font-serif text-[17px] leading-[1.15] text-text-primary">
          Personal
          <br />
          Assistant
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium no-underline transition-colors duration-150",
                isActive
                  ? "bg-accent-subtle text-accent"
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
        <div className="flex items-center gap-3 border-t border-border-subtle pt-4">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-subtle text-[13px] font-semibold uppercase text-accent"
          >
            {displayName.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold capitalize text-text-primary">
              {displayName}
            </span>
            <span className="block truncate text-xs text-text-tertiary">{userEmail}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-text-tertiary" aria-hidden />
        </div>
      )}
    </aside>
  );
}
