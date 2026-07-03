import { createClient } from "@/lib/supabase/server";

export type ProfileRole = "admin" | "partner" | "attorney" | "staff" | "billing" | "read_only";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: ProfileRole;
  job_title: string | null;
  avatar_url: string | null;
  is_active: boolean;
};

export type ProfileUpdate = Pick<Profile, "full_name" | "job_title" | "avatar_url">;

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,job_title,avatar_url,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function updateCurrentProfile(update: ProfileUpdate): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Your session has expired. Please sign in again." };
    }

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select("id")
      .single();

    if (error) {
      return { ok: false, message: "We could not update your profile." };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "Recovery Hub is not connected to Supabase yet." };
  }
}
