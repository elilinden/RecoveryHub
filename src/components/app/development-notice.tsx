"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

const storageKey = "recovery-hub-dev-notice-dismissed";
const subscribe = () => () => {};

export function DevelopmentNotice() {
  const storedDismissed = useSyncExternalStore(
    subscribe,
    () => window.sessionStorage.getItem(storageKey) === "1",
    () => false
  );
  const [dismissedForSession, setDismissedForSession] = useState(false);

  if (storedDismissed || dismissedForSession) return null;

  return (
    <div
      className="mb-4 flex min-w-0 items-start gap-3 rounded-lg border border-[color:var(--warning)]/20 bg-[var(--warning-muted)] px-3 py-2 text-sm text-[var(--warning)]"
      aria-label="Development environment notice"
      role="alert"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Development environment</p>
        <p className="mt-0.5 leading-5">Supabase is not configured, so isolated fictional development data is shown.</p>
      </div>
      <Button
        aria-label="Dismiss development environment notice for this session"
        className="size-8 shrink-0 text-[var(--warning)] hover:bg-[var(--warning)]/10"
        size="icon"
        type="button"
        variant="ghost"
        onClick={() => {
          window.sessionStorage.setItem(storageKey, "1");
          setDismissedForSession(true);
        }}
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
