"use client";

import { useState, useSyncExternalStore } from "react";
import { FlaskConical, X } from "lucide-react";

const storageKey = "recovery-hub-dev-notice-dismissed";
const subscribe = () => () => {};

export function DevelopmentNotice() {
  const storedDismissed = useSyncExternalStore(
    subscribe,
    () => window.sessionStorage.getItem(storageKey) === "1",
    () => false
  );
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const dismissed = storedDismissed || dismissedForSession;

  function dismiss() {
    window.sessionStorage.setItem(storageKey, "1");
    setDismissedForSession(true);
  }

  function restore() {
    window.sessionStorage.removeItem(storageKey);
    setDismissedForSession(false);
  }

  if (dismissed) {
    return (
      <button
        aria-label="Show development environment details"
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={restore}
        type="button"
      >
        <FlaskConical aria-hidden="true" className="size-3.5" />
        Dev data
      </button>
    );
  }

  return (
    <div
      aria-label="Development environment notice"
      className="mb-4 flex min-w-0 items-center gap-3 rounded-lg border border-[color:var(--warning)]/25 bg-[var(--warning-muted)] px-3 py-2 text-sm text-[var(--warning)]"
      role="status"
    >
      <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 truncate">
        <span className="font-semibold">Development environment.</span> Showing sample data because Supabase isn&apos;t connected yet.
      </p>
      <button
        aria-label="Dismiss development environment notice for this session"
        className="shrink-0 rounded-md p-1 text-[var(--warning)] transition-colors hover:bg-[var(--warning)]/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={dismiss}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
