import type { ProfileRole } from "@/lib/data/profiles";

export type UserAccountStatus = "confirmed" | "invited";

export type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  role: ProfileRole;
  jobTitle: string | null;
  isActive: boolean;
  accountStatus: UserAccountStatus;
  createdAt: string;
  lastSignInAt: string | null;
};

export type UserActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
