"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateUserAction } from "@/lib/users/actions";
import { roleLabels } from "@/lib/users/labels";
import type { ManagedUser, UserActionResult } from "@/lib/users/types";

type EditUserDialogProps = {
  user: ManagedUser;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (result: UserActionResult) => void;
  refresh: () => void;
};

export function EditUserDialog({ user, isSelf, open, onOpenChange, onResult, refresh }: EditUserDialogProps) {
  const [pending, startTransition] = useTransition();
  const [localResult, setLocalResult] = useState<UserActionResult | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateUserAction(null, formData);
      setLocalResult(result);
      onResult(result);
      if (result.ok) {
        onOpenChange(false);
        refresh();
      }
    });
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (next) setLocalResult(null);
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {user.fullName}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" key={user.id} onSubmit={handleSubmit}>
          <input name="userId" type="hidden" value={user.id} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`edit-full-name-${user.id}`}>
              Full name
            </label>
            <Input defaultValue={user.fullName} id={`edit-full-name-${user.id}`} name="fullName" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`edit-job-title-${user.id}`}>
              Job title
            </label>
            <Input defaultValue={user.jobTitle ?? ""} id={`edit-job-title-${user.id}`} name="jobTitle" />
          </div>
          {isSelf ? (
            <>
              <input name="role" type="hidden" value="admin" />
              <input name="isActive" type="hidden" value="true" />
              <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                Role: <span className="font-medium text-foreground">Admin</span> · Access:{" "}
                <span className="font-medium text-foreground">Active</span>. You cannot change your own role or access here.
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor={`edit-role-${user.id}`}>
                  Role
                </label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue={user.role}
                  id={`edit-role-${user.id}`}
                  name="role"
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input defaultChecked={user.isActive} name="isActive" type="checkbox" />
                Active
              </label>
            </>
          )}
          {localResult && !localResult.ok ? (
            <p
              className="rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]"
              role="alert"
            >
              {localResult.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={pending} onClick={() => onOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
