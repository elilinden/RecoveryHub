"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { confirmAuthLinkAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = { status: "idle" };

type ConfirmAuthLinkFormProps = {
  tokenHash: string;
  type: "invite" | "recovery";
};

/**
 * Deliberately a real form with a submit button rather than something that
 * runs automatically on page load — see the comment on confirmAuthLinkAction
 * for why that distinction is what actually stops email security scanners
 * from consuming the one-time link before a human clicks it.
 */
export function ConfirmAuthLinkForm({ tokenHash, type }: ConfirmAuthLinkFormProps) {
  const [state, action, pending] = useActionState(confirmAuthLinkAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <input name="token_hash" type="hidden" value={tokenHash} />
      <input name="type" type="hidden" value={type} />
      <p className="text-sm text-muted-foreground">
        {type === "invite"
          ? "You've been invited to Recovery Hub. Click below to accept and set your password."
          : "Click below to continue resetting your password."}
      </p>
      {state.message ? (
        <p
          className="rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
      <Button className="h-10 w-full" disabled={pending} type="submit">
        {pending ? "Confirming..." : type === "invite" ? "Accept Invitation" : "Continue"}
      </Button>
    </form>
  );
}
