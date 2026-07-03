"use client";

import { LogOut } from "lucide-react";

import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import type { Profile } from "@/lib/data/profiles";

type UserProfileProps = {
  profile: Pick<Profile, "full_name" | "job_title">;
};

export function UserProfile({ profile }: UserProfileProps) {
  return (
    <div className="border-t border-sidebar-border p-4">
      <div className="flex items-center gap-3">
        <UserAvatar className="size-10" name={profile.full_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{profile.full_name}</p>
          <p className="text-sm text-muted-foreground">{profile.job_title ?? "Recovery Hub user"}</p>
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
