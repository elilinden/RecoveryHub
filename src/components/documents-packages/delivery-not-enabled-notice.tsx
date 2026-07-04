"use client";

import { useState, useSyncExternalStore } from "react";
import { Info, X } from "lucide-react";

const storageKey = "recovery-hub-packages-delivery-notice-dismissed";
const subscribe = () => () => {};

export function DeliveryNotEnabledNotice() {
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

  if (dismissed) {
    return null;
  }

  return (
    <div
      className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-muted-foreground"
      role="status"
    >
      <Info aria-hidden="true" className="size-4 shrink-0" />
      <p className="min-w-0 flex-1">
        <span className="font-medium text-foreground">Delivery not enabled</span> — Packages can currently be prepared
        and approved, but not sent from Recovery Hub.
      </p>
      <button
        aria-label="Dismiss delivery notice for this session"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={dismiss}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
