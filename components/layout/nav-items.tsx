import { LayoutDashboard, Map, Calendar, Inbox, Receipt, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "Trips", icon: Map },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/costs", label: "AI costs", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];
