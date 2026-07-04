"use client";

import { useEffect, useState } from "react";

type BridgeStatus = "idle" | "checking" | "ready" | "error";

function initialStatus(): BridgeStatus {
  if (typeof window === "undefined") return "idle";
  return window.location.hash.includes("access_token") ? "checking" : "idle";
}

/**
 * Admin invitations use Supabase's implicit flow (PKCE is not supported for
 * inviteUserByEmail), so the session tokens arrive in the URL hash fragment,
 * which never reaches the server. This establishes the session client-side
 * before the reset-password form submits.
 */
export function InviteSessionBridge() {
  const [status, setStatus] = useState<BridgeStatus>(initialStatus);

  useEffect(() => {
    if (status !== "checking") return;

    let cancelled = false;
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    (async () => {
      if (!access_token || !refresh_token) {
        if (!cancelled) setStatus("error");
        return;
      }

      const { isSupabaseConfigured } = await import("@/lib/supabase/env");
      if (!isSupabaseConfigured()) {
        if (!cancelled) setStatus("error");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (!cancelled) setStatus(error ? "error" : "ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "checking") {
    return (
      <p className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground" role="status">
        Preparing your account...
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]" role="alert">
        This invitation link is expired or invalid. Ask an administrator to resend it.
      </p>
    );
  }

  return null;
}
