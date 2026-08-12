import { LayoutDashboard, Map, Inbox, Calendar, Flag, Receipt, Settings, MessagesSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "Trips", icon: Map },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/conversations", label: "Keskustelut", icon: MessagesSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/golf", label: "Golf", icon: Flag },
  { href: "/costs", label: "AI costs", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];
