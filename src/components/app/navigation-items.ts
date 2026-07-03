import { Gauge, PlusCircle, Scale, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "Matters", href: "/matters", icon: Scale },
  { label: "Add Matter", href: "/matters/new", icon: PlusCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];
