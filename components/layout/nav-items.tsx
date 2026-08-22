import { LayoutDashboard, Inbox, Calendar, Flag, Settings, MessagesSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/conversations", label: "Keskustelut", icon: MessagesSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/golf", label: "Golf", icon: Flag },
  { href: "/settings", label: "Settings", icon: Settings },
];
