import type { ReactNode } from "react";

import { MobileNavigation } from "@/components/app/mobile-navigation";
import { Sidebar } from "@/components/app/sidebar";
import type { Profile } from "@/lib/data/profiles";

type AppShellProps = {
  children: ReactNode;
  profile: Profile;
  configurationNotice?: ReactNode;
};

export function AppShell({ children, profile, configurationNotice }: AppShellProps) {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
        href="#main-content"
      >
        Skip to content
      </a>
      <Sidebar profile={profile} />
      <div className="min-w-0 lg:pl-72">
        <MobileNavigation profile={profile} />
        <main className="mx-auto min-w-0 w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" id="main-content">
          {configurationNotice}
          <div className="min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
