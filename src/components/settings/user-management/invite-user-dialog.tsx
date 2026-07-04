"use client";

import { useRef, useState, useTransition } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { inviteUserAction } from "@/lib/users/actions";
import { roleLabels } from "@/lib/users/labels";
import type { UserActionResult } from "@/lib/users/types";

type InviteUserDialogProps = {
  onResult: (result: UserActionResult) => void;
  refresh: () => void;
};

export function InviteUserDialog({ onResult, refresh }: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [localResult, setLocalResult] = useState<UserActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await inviteUserAction(null, formData);
      setLocalResult(result);
      onResult(result);
      if (result.ok) {
        formRef.current?.reset();
        setOpen(false);
        refresh();
      }
    });
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (next) setLocalResult(null);
        setOpen(next);
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button className="shrink-0 gap-2" type="button">
          <UserPlus aria-hidden="true" className="size-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>They will receive an email invitation to set a password and sign in.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} ref={formRef}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="invite-full-name">
              Full name
            </label>
            <Input id="invite-full-name" name="fullName" required />
            {localResult && !localResult.ok && localResult.fieldErrors?.fullName ? (
              <p className="text-sm text-[var(--urgent)]">{localResult.fieldErrors.fullName}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="invite-email">
              Email
            </label>
            <Input id="invite-email" name="email" required type="email" />
            {localResult && !localResult.ok && localResult.fieldErrors?.email ? (
              <p className="text-sm text-[var(--urgent)]">{localResult.fieldErrors.email}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="invite-job-title">
              Job title <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input id="invite-job-title" name="jobTitle" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="invite-role">
              Role
            </label>
            <select
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              defaultValue=""
              id="invite-role"
              name="role"
              required
            >
              <option disabled value="">
                Select a role
              </option>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {localResult && !localResult.ok && localResult.fieldErrors?.role ? (
              <p className="text-sm text-[var(--urgent)]">{localResult.fieldErrors.role}</p>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input defaultChecked name="isActive" type="checkbox" />
            Activate account immediately
          </label>
          {localResult && !localResult.ok ? (
            <p
              className="rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]"
              role="alert"
            >
              {localResult.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
