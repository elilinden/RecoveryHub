"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfileAction, type AuthActionState } from "@/lib/auth/actions";
import type { Profile } from "@/lib/data/profiles";

type ProfileSettingsFormProps = {
  profile: Profile;
};

const initialState: AuthActionState = { status: "idle" };

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const [state, action, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={action} className="mt-5 grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="full_name">
            Full name
          </label>
          <Input id="full_name" name="full_name" required defaultValue={profile.full_name} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="job_title">
            Job title
          </label>
          <Input id="job_title" name="job_title" required defaultValue={profile.job_title ?? ""} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-foreground" htmlFor="avatar_url">
            Avatar URL
          </label>
          <Input id="avatar_url" name="avatar_url" defaultValue={profile.avatar_url ?? ""} placeholder="https://..." />
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground">
        Role: <span className="font-medium text-foreground">{profile.role}</span>. Active status:{" "}
        <span className="font-medium text-foreground">{profile.is_active ? "Active" : "Inactive"}</span>. These fields
        cannot be changed here.
      </div>
      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-lg bg-[var(--success-muted)] px-3 py-2 text-sm text-[var(--success)]"
              : "rounded-lg bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <Button className="w-fit" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
