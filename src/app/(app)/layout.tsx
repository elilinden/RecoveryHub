import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { DevelopmentNotice } from "@/components/app/development-notice";
import { requireActiveProfile } from "@/lib/auth/session";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = await requireActiveProfile();

  return (
    <AppShell
      configurationNotice={
        session.status === "missing_env" ? <DevelopmentNotice /> : null
      }
      profile={session.profile}
    >
      {children}
    </AppShell>
  );
}
