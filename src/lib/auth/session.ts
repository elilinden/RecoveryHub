import { redirect } from "next/navigation";

import type { Profile } from "@/lib/data/profiles";
import { getCurrentProfile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type SessionState =
  | { status: "configured"; profile: Profile }
  | { status: "missing_env"; profile: Profile };

export async function requireActiveProfile(): Promise<SessionState> {
  if (!isSupabaseConfigured()) {
    return {
      status: "missing_env",
      profile: {
        id: "development-profile",
        email: "eli.linden@example.test",
        full_name: "Eli Linden",
        role: "attorney",
        job_title: "Attorney",
        avatar_url: null,
        is_active: true,
      },
    };
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login?error=session");
  }

  if (!profile.is_active) {
    redirect("/login?error=inactive");
  }

  return { status: "configured", profile };
}
