"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { removeUserAccessAction, setUserActiveStatusAction } from "@/lib/users/actions";
import type { ManagedUser, UserActionResult } from "@/lib/users/types";

export type ConfirmKind = "activate" | "deactivate" | "remove";

const copy: Record<ConfirmKind, { title: string; description: string; confirmLabel: string; destructive: boolean }> = {
  activate: {
    title: "Activate this user?",
    description: "They will regain sign-in access to Recovery Hub.",
    confirmLabel: "Activate",
    destructive: false,
  },
  deactivate: {
    title: "Deactivate this user?",
    description:
      "They will immediately lose sign-in access to Recovery Hub. Their account and historical activity will be preserved.",
    confirmLabel: "Deactivate",
    destructive: true,
  },
  remove: {
    title: "Remove access?",
    description: "This user will no longer be able to access Recovery Hub. Their account and historical activity will be preserved.",
    confirmLabel: "Remove Access",
    destructive: true,
  },
};

type ConfirmAccessDialogProps = {
  kind: ConfirmKind | null;
  user: ManagedUser;
  onOpenChange: (open: boolean) => void;
  onResult: (result: UserActionResult) => void;
  refresh: () => void;
};

export function ConfirmAccessDialog({ kind, user, onOpenChange, onResult, refresh }: ConfirmAccessDialogProps) {
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  function handleConfirm() {
    if (!kind) return;
    setLocalError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", user.id);
      let result: UserActionResult;
      if (kind === "remove") {
        result = await removeUserAccessAction(null, formData);
      } else {
        formData.set("isActive", kind === "activate" ? "true" : "false");
        result = await setUserActiveStatusAction(null, formData);
      }
      onResult(result);
      if (result.ok) {
        onOpenChange(false);
        refresh();
      } else {
        setLocalError(result.message);
      }
    });
  }

  if (!kind) return null;
  const details = copy[kind];

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) setLocalError(null);
        onOpenChange(next);
      }}
      open={Boolean(kind)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{details.title}</DialogTitle>
          <DialogDescription>{details.description}</DialogDescription>
        </DialogHeader>
        {localError ? (
          <p
            className="rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]"
            role="alert"
          >
            {localError}
          </p>
        ) : null}
        <DialogFooter>
          <Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={pending} onClick={handleConfirm} type="button" variant={details.destructive ? "destructive" : "default"}>
            {pending ? "Working..." : details.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
