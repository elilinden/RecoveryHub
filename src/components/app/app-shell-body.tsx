"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { MobileNavigation } from "@/components/app/mobile-navigation";
import { Sidebar } from "@/components/app/sidebar";
import { SIDEBAR_COLLAPSE_COOKIE } from "@/lib/app-shell/sidebar-cookie";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/data/profiles";

type AppShellBodyProps = {
  children: ReactNode;
  profile: Profile;
  actionFeedback?: ReactNode;
  configurationNotice?: ReactNode;
  defaultCollapsed: boolean;
};

export function AppShellBody({ children, profile, actionFeedback, configurationNotice, defaultCollapsed }: AppShellBodyProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous;
      document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <>
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} profile={profile} />
      <div className={cn("min-w-0 transition-[padding-left] duration-200", collapsed ? "lg:pl-[4.5rem]" : "lg:pl-72")}>
        <MobileNavigation profile={profile} />
        <main className="mx-auto min-w-0 w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" id="main-content">
          {configurationNotice}
          {actionFeedback}
          <div className="min-w-0">{children}</div>
        </main>
      </div>
    </>
  );
}
