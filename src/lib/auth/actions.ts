"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { updateCurrentProfile } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const next = getString(formData, "next") || "/dashboard";

  if (!email || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { status: "error", message: "We could not sign you in with those credentials." };
    }
  } catch {
    return { status: "error", message: "Recovery Hub is not connected to Supabase yet." };
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = getString(formData, "email");

  if (!email) {
    return { status: "error", message: "Enter the email address for your internal account." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getOrigin()}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { status: "error", message: "We could not start a password reset for that account." };
    }
  } catch {
    return { status: "error", message: "Recovery Hub is not connected to Supabase yet." };
  }

  return { status: "success", message: "If that account exists, a reset link has been sent." };
}

export async function resetPasswordAction(
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = getString(formData, "password");

  if (password.length < 8) {
    return { status: "error", message: "Use a password with at least 8 characters." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { status: "error", message: "This reset link is expired or invalid." };
    }
  } catch {
    return { status: "error", message: "Recovery Hub is not connected to Supabase yet." };
  }

  return { status: "success", message: "Your password has been updated. You may return to sign in." };
}

export async function signOutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Missing local Supabase configuration should still clear the visual session.
  }

  redirect("/login");
}

export async function updateProfileAction(
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = getString(formData, "full_name");
  const jobTitle = getString(formData, "job_title");
  const avatarUrl = getString(formData, "avatar_url");

  if (!fullName || !jobTitle) {
    return { status: "error", message: "Full name and job title are required." };
  }

  const result = await updateCurrentProfile({
    full_name: fullName,
    job_title: jobTitle,
    avatar_url: avatarUrl || null,
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath("/settings");
  return { status: "success", message: "Profile updated." };
}
