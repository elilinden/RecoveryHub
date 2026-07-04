"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmAccessDialog, type ConfirmKind } from "@/components/settings/user-management/confirm-access-dialog";
import { EditUserDialog } from "@/components/settings/user-management/edit-user-dialog";
import { resendInvitationAction } from "@/lib/users/actions";
import type { ManagedUser, UserActionResult } from "@/lib/users/types";

type UserRowMenuProps = {
  user: ManagedUser;
  isSelf: boolean;
  onResult: (result: UserActionResult) => void;
  refresh: () => void;
};

export function UserRowMenu({ user, isSelf, onResult, refresh }: UserRowMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null);
  const [isResending, startResend] = useTransition();

  function resend() {
    startResend(async () => {
      const formData = new FormData();
      formData.set("userId", user.id);
      const result = await resendInvitationAction(null, formData);
      onResult(result);
      if (result.ok) refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label={`Actions for ${user.fullName}`} size="icon-sm" type="button" variant="outline">
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit user</DropdownMenuItem>
          {user.isActive ? (
            <DropdownMenuItem disabled={isSelf} onSelect={() => setConfirmKind("deactivate")}>
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setConfirmKind("activate")}>Activate</DropdownMenuItem>
          )}
          {user.accountStatus === "invited" ? (
            <DropdownMenuItem disabled={isResending} onSelect={resend}>
              {isResending ? "Resending..." : "Resend Invitation"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isSelf} onSelect={() => setConfirmKind("remove")} variant="destructive">
            Remove Access
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog isSelf={isSelf} onOpenChange={setEditOpen} onResult={onResult} open={editOpen} refresh={refresh} user={user} />
      <ConfirmAccessDialog
        kind={confirmKind}
        onOpenChange={(open) => !open && setConfirmKind(null)}
        onResult={onResult}
        refresh={refresh}
        user={user}
      />
    </>
  );
}
