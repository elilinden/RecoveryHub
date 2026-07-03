"use client";

import { LogOut } from "lucide-react";

import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";
import type { Profile } from "@/lib/data/profiles";

type UserProfileProps = {
  profile: Pick<Profile, "full_name" | "job_title">;
  collapsed?: boolean;
};

export function UserProfile({ profile, collapsed = false }: UserProfileProps) {
  if (collapsed) {
    return (
      <div className="flex justify-center border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`${profile.full_name} account menu`}
              className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              title={profile.full_name}
              type="button"
            >
              <UserAvatar className="size-9" name={profile.full_name} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56" side="right">
            <DropdownMenuLabel className="py-1.5">
              <p className="text-sm font-semibold text-foreground">{profile.full_name}</p>
              <p className="text-xs font-normal text-muted-foreground">{profile.job_title ?? "Recovery Hub user"}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem asChild variant="destructive">
                <button className="w-full" type="submit">
                  <LogOut aria-hidden="true" className="size-4" />
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border p-4">
      <div className="flex items-center gap-3">
        <UserAvatar className="size-10" name={profile.full_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{profile.full_name}</p>
          <p className="truncate text-sm text-muted-foreground">{profile.job_title ?? "Recovery Hub user"}</p>
        </div>
      </div>
      <form action={signOutAction}>
        <Button className="mt-3 w-full justify-start gap-2" type="submit" variant="ghost">
          <LogOut aria-hidden="true" className="size-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
