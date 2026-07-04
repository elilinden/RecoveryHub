"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  inviteUser,
  removeUserAccess,
  requireAdmin,
  resendInvitation,
  setUserActiveStatus,
  updateUser,
} from "@/lib/users/service";
import { inviteUserSchema, setActiveStatusSchema, updateUserSchema, userIdSchema } from "@/lib/users/validation";
import type { UserActionResult } from "@/lib/users/types";

function parseForm<T>(schema: z.ZodType<T>, formData: FormData): { ok: true; data: T } | { ok: false; result: UserActionResult } {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    return {
      ok: false,
      result: {
        ok: false,
        message: "Review the highlighted fields and try again.",
        fieldErrors: Object.fromEntries(Object.entries(fieldErrors).map(([key, values]) => [key, values?.[0] ?? "Check this field."])),
      },
    };
  }
  return { ok: true, data: parsed.data };
}

function toBoolean(value: string | undefined) {
  return value === "on" || value === "true";
}

export async function inviteUserAction(_state: UserActionResult | null, formData: FormData): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  const parsed = parseForm(inviteUserSchema, formData);
  if (!parsed.ok) return parsed.result;

  const result = await inviteUser(
    {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      jobTitle: parsed.data.jobTitle || "",
      role: parsed.data.role,
      isActive: toBoolean(parsed.data.isActive),
    },
    guard.profile
  );

  if (result.ok) revalidatePath("/settings");
  return result;
}

export async function updateUserAction(_state: UserActionResult | null, formData: FormData): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  const parsed = parseForm(updateUserSchema, formData);
  if (!parsed.ok) return parsed.result;

  const result = await updateUser(
    {
      userId: parsed.data.userId,
      fullName: parsed.data.fullName,
      jobTitle: parsed.data.jobTitle || "",
      role: parsed.data.role,
      isActive: toBoolean(parsed.data.isActive),
    },
    guard.profile
  );

  if (result.ok) revalidatePath("/settings");
  return result;
}

export async function setUserActiveStatusAction(_state: UserActionResult | null, formData: FormData): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  const parsed = parseForm(setActiveStatusSchema, formData);
  if (!parsed.ok) return parsed.result;

  const result = await setUserActiveStatus(parsed.data.userId, parsed.data.isActive === "true", guard.profile);
  if (result.ok) revalidatePath("/settings");
  return result;
}

export async function removeUserAccessAction(_state: UserActionResult | null, formData: FormData): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  const parsed = parseForm(userIdSchema, formData);
  if (!parsed.ok) return parsed.result;

  const result = await removeUserAccess(parsed.data.userId, guard.profile);
  if (result.ok) revalidatePath("/settings");
  return result;
}

export async function resendInvitationAction(_state: UserActionResult | null, formData: FormData): Promise<UserActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  const parsed = parseForm(userIdSchema, formData);
  if (!parsed.ok) return parsed.result;

  const result = await resendInvitation(parsed.data.userId, guard.profile);
  if (result.ok) revalidatePath("/settings");
  return result;
}
