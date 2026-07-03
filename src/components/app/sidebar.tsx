"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { NavigationLinks } from "@/components/app/navigation-links";
import { UserProfile } from "@/components/app/user-profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/data/profiles";

type SidebarProps = {
  profile: Profile;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function Sidebar({ profile, collapsed, onToggleCollapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.5rem]" : "w-72"
      )}
    >
      <div className={cn("flex h-16 items-center gap-3 border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-5")}>
        {collapsed ? null : (
          <>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              RH
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-sidebar-foreground">Recovery Hub</p>
              <p className="truncate text-xs text-muted-foreground">Legal operations</p>
            </div>
          </>
        )}
        <Button
          aria-label={collapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
          className={collapsed ? "" : "shrink-0"}
          onClick={onToggleCollapsed}
          size="icon"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          type="button"
          variant="ghost"
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" className="size-5" /> : <PanelLeftClose aria-hidden="true" className="size-5" />}
        </Button>
      </div>
      <div className={cn("flex-1 py-4", collapsed ? "px-2" : "px-3")}>
        <NavigationLinks collapsed={collapsed} />
      </div>
      <UserProfile collapsed={collapsed} profile={profile} />
    </aside>
  );
}
