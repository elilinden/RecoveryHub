import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppShellBody } from "@/components/app/app-shell-body";
import { SIDEBAR_COLLAPSE_COOKIE } from "@/lib/app-shell/sidebar-cookie";
import type { Profile } from "@/lib/data/profiles";

type AppShellProps = {
  children: ReactNode;
  profile: Profile;
  configurationNotice?: ReactNode;
};

export async function AppShell({ children, profile, configurationNotice }: AppShellProps) {
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get(SIDEBAR_COLLAPSE_COOKIE)?.value === "1";

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        href="#main-content"
      >
        Skip to content
      </a>
      <AppShellBody configurationNotice={configurationNotice} defaultCollapsed={defaultCollapsed} profile={profile}>
        {children}
      </AppShellBody>
    </div>
  );
}
