"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

type ExchangePhase = "idle" | "checking" | "ready" | "error";

const subscribe = () => () => {};

function hasInviteHash() {
  return window.location.hash.includes("access_token");
}

/**
 * Admin invitations use Supabase's implicit flow (PKCE is not supported for
 * inviteUserByEmail), so the session tokens arrive in the URL hash fragment,
 * which never reaches the server. This establishes the session client-side
 * before the reset-password form submits.
 *
 * The token exchange only runs after an explicit "Continue" click rather than
 * automatically on page load. Corporate/institutional email security scanners
 * (Microsoft Safe Links, Proofpoint, Mimecast, etc.) pre-visit every link in
 * an incoming email with a real headless browser to scan it, which would
 * otherwise silently consume this one-time link before the recipient ever
 * opens it. Scanners load pages; they don't click buttons.
 *
 * The hash can only be read client-side (the server never sees it), so
 * detecting it goes through useSyncExternalStore rather than a state
 * initializer, to avoid a server/client hydration mismatch.
 */
export function InviteSessionBridge() {
  const hasHashToken = useSyncExternalStore(subscribe, hasInviteHash, () => false);
  const [phase, setPhase] = useState<ExchangePhase>("idle");

  useEffect(() => {
    if (phase !== "checking") return;

    let cancelled = false;
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    (async () => {
      if (!access_token || !refresh_token) {
        if (!cancelled) setPhase("error");
        return;
      }

      const { isSupabaseConfigured } = await import("@/lib/supabase/env");
      if (!isSupabaseConfigured()) {
        if (!cancelled) setPhase("error");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (!cancelled) setPhase(error ? "error" : "ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [phase]);

  if (!hasHashToken) {
    return null;
  }

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-secondary px-3 py-3 text-sm text-foreground">
        <p>Click continue to open your invitation and set up your account.</p>
        <Button onClick={() => setPhase("checking")} type="button">
          Continue
        </Button>
      </div>
    );
  }

  if (phase === "checking") {
    return (
      <p className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground" role="status">
        Preparing your account...
      </p>
    );
  }

  if (phase === "error") {
    return (
      <p className="rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]" role="alert">
        This invitation link is expired or invalid. Ask an administrator to resend it.
      </p>
    );
  }

  return null;
}
