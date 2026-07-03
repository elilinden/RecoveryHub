"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationItems } from "@/components/app/navigation-items";
import { cn } from "@/lib/utils";

type NavigationLinksProps = {
  onNavigate?: () => void;
  collapsed?: boolean;
};

export function NavigationLinks({ onNavigate, collapsed = false }: NavigationLinksProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary navigation" className="space-y-1">
      {navigationItems.map((item) => {
        const isActive =
          item.href === "/matters"
            ? pathname === "/matters" || pathname.startsWith("/matters/")
            : item.href === "/packages"
              ? pathname === "/packages" || pathname.startsWith("/packages/")
            : pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
              collapsed && "justify-center px-0"
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {collapsed ? null : <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
