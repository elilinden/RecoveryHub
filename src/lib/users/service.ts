import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile, type Profile, type ProfileRole } from "@/lib/data/profiles";
import type { ManagedUser, UserActionResult } from "@/lib/users/types";

type AdminGuardResult = { ok: true; profile: Profile } | { ok: false; result: UserActionResult };

/**
 * Every user-management operation must call this first. The service-role
 * client bypasses RLS, so the caller's admin status is re-verified here from
 * the authenticated session rather than trusted from client input.
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, result: { ok: false, message: "Recovery Hub is not connected to Supabase yet." } };
  }

  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    return { ok: false, result: { ok: false, message: "Your session has expired. Please sign in again." } };
  }

  if (profile.role !== "admin") {
    return { ok: false, result: { ok: false, message: "Only an administrator can manage users." } };
  }

  return { ok: true, profile };
}

function getSiteOrigin(): { ok: true; origin: string } | { ok: false } {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return { ok: true, origin: configured };
  if (process.env.NODE_ENV === "production") {
    console.error("[users/service] NEXT_PUBLIC_SITE_URL is not set in production — refusing to build an invite/reset link against localhost.");
    return { ok: false };
  }
  return { ok: true, origin: "http://localhost:3000" };
}

/**
 * User-facing messages stay generic (never leak raw Postgres/Auth errors), but every
 * failure is logged server-side with enough context (action, target, error) for an
 * operator to actually diagnose a support ticket instead of just seeing "something failed."
 */
function logServiceError(action: string, context: Record<string, unknown>, error: unknown) {
  console.error(`[users/service] ${action} failed`, { ...context, error });
}

type AuthStatus = { confirmedAt: string | null; lastSignInAt: string | null };

async function loadAuthStatusMap(): Promise<Map<string, AuthStatus>> {
  const map = new Map<string, AuthStatus>();
  const admin = createAdminClient();
  if (!admin) return map;

  const perPage = 200;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data) break;

    for (const user of data.users) {
      map.set(user.id, {
        confirmedAt: user.confirmed_at ?? user.email_confirmed_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
      });
    }

    if (data.users.length < perPage) break;
  }

  return map;
}

export async function listManagedUsers(): Promise<ManagedUser[] | null> {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,job_title,avatar_url,is_active,created_at")
    .order("created_at", { ascending: false });

  if (error || !profiles) return null;

  const authStatusById = await loadAuthStatusMap();

  return profiles.map((profile) => {
    const authStatus = authStatusById.get(profile.id);
    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      jobTitle: profile.job_title,
      isActive: profile.is_active,
      accountStatus: authStatus?.confirmedAt ? "confirmed" : "invited",
      createdAt: profile.created_at,
      lastSignInAt: authStatus?.lastSignInAt ?? null,
    };
  });
}

async function logUserActivity(input: {
  actorId: string;
  actionType: "user_invited" | "user_updated" | "user_activated" | "user_deactivated" | "invitation_resent" | "access_removed";
  targetUserId: string;
  description: string;
}) {
  const supabase = await createClient();
  await supabase.from("activity_logs").insert({
    matter_id: null,
    actor_id: input.actorId,
    action_type: input.actionType,
    entity_type: "profile",
    entity_id: input.targetUserId,
    description: input.description,
  });
}

async function hasOtherActiveAdmin(targetId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true)
    .neq("id", targetId);
  return (count ?? 0) > 0;
}

export async function inviteUser(
  input: { fullName: string; email: string; jobTitle: string; role: ProfileRole; isActive: boolean },
  actingAdmin: Profile
): Promise<UserActionResult> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, message: "User invitations require Supabase admin configuration (SUPABASE_SERVICE_ROLE_KEY)." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("profiles").select("id").ilike("email", input.email).maybeSingle();

  if (existing) {
    return {
      ok: false,
      message: "A user with this email already exists.",
      fieldErrors: { email: "This email is already in use." },
    };
  }

  // redirectTo only needs to pass Supabase's allow-listed redirect URL check now —
  // the actual invite link is built from {{ .TokenHash }} in the Supabase email
  // template (see docs/supabase-foundation.md), not from this value.
  const origin = getSiteOrigin();
  if (!origin.ok) {
    return { ok: false, message: "Recovery Hub is not fully configured (missing site URL). Contact an administrator before sending invitations." };
  }
  const redirectTo = `${origin.origin}/reset-password`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { full_name: input.fullName },
    redirectTo,
  });

  if (error || !data.user) {
    logServiceError("inviteUser", { email: input.email }, error);
    // A concurrent invite for the same email (two admins inviting at once) is the most common
    // cause of this failing right after the pre-check above passed — the profiles.email/
    // auth.users.email uniqueness constraints are the real guard, this pre-check is just a
    // fast-path. Distinguish that case so the losing admin isn't left guessing.
    const { data: nowExists } = await supabase.from("profiles").select("id").ilike("email", input.email).maybeSingle();
    if (nowExists) {
      return {
        ok: false,
        message: "Someone else just invited this email address. Refresh the list — if they need a different role or access, edit them instead of re-inviting.",
      };
    }
    return { ok: false, message: "We could not send an invitation to that address. It may already be registered." };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      email: input.email,
      full_name: input.fullName,
      job_title: input.jobTitle || null,
      role: input.role,
      is_active: input.isActive,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    logServiceError("inviteUser", { email: input.email, authUserId: data.user.id }, profileError);
    return {
      ok: false,
      message: `${input.email} was invited, but we could not apply the selected role and access. They currently have default read-only, inactive access — edit them from the list to fix this.`,
    };
  }

  await logUserActivity({
    actorId: actingAdmin.id,
    actionType: "user_invited",
    targetUserId: data.user.id,
    description: `Invited ${input.fullName} (${input.email}) as ${input.role}.`,
  });

  return { ok: true, message: `Invitation sent to ${input.email}.` };
}

export async function updateUser(
  input: { userId: string; fullName: string; jobTitle: string; role: ProfileRole; isActive: boolean },
  actingAdmin: Profile
): Promise<UserActionResult> {
  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id,role,is_active,full_name,email")
    .eq("id", input.userId)
    .maybeSingle();

  if (fetchError) {
    logServiceError("updateUser", { userId: input.userId }, fetchError);
    return { ok: false, message: "We could not look up this user. Try again shortly." };
  }
  if (!target) {
    return { ok: false, message: "We could not find that user. They may have been removed." };
  }

  const isSelf = target.id === actingAdmin.id;
  if (isSelf && !input.isActive) {
    return { ok: false, message: "You cannot deactivate your own account." };
  }
  if (isSelf && input.role !== "admin") {
    return { ok: false, message: "You cannot remove your own admin role." };
  }

  const wasActiveAdmin = target.role === "admin" && target.is_active;
  const staysActiveAdmin = input.role === "admin" && input.isActive;
  if (wasActiveAdmin && !staysActiveAdmin && !(await hasOtherActiveAdmin(target.id))) {
    return { ok: false, message: "At least one active administrator is required. Promote another admin before changing this." };
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName,
      job_title: input.jobTitle || null,
      role: input.role,
      is_active: input.isActive,
    })
    .eq("id", input.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    logServiceError("updateUser", { userId: input.userId }, error);
    return { ok: false, message: "We could not update this user." };
  }
  if (!updated) {
    logServiceError("updateUser", { userId: input.userId }, "update matched 0 rows");
    return { ok: false, message: "This user could not be updated — they may have been removed or changed by someone else. Refresh and try again." };
  }

  await logUserActivity({
    actorId: actingAdmin.id,
    actionType: "user_updated",
    targetUserId: input.userId,
    description: `Updated ${target.full_name || target.email}: role set to ${input.role}, access ${input.isActive ? "active" : "inactive"}.`,
  });

  return { ok: true, message: "User updated." };
}

export async function setUserActiveStatus(userId: string, isActive: boolean, actingAdmin: Profile): Promise<UserActionResult> {
  if (userId === actingAdmin.id && !isActive) {
    return { ok: false, message: "You cannot deactivate your own account." };
  }

  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id,role,is_active,full_name,email")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) {
    logServiceError("setUserActiveStatus", { userId }, fetchError);
    return { ok: false, message: "We could not look up this user. Try again shortly." };
  }
  if (!target) {
    return { ok: false, message: "We could not find that user. They may have been removed." };
  }

  if (!isActive && target.role === "admin" && target.is_active && !(await hasOtherActiveAdmin(userId))) {
    return { ok: false, message: "At least one active administrator is required." };
  }

  const { data: updated, error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", userId).select("id").maybeSingle();

  if (error) {
    logServiceError("setUserActiveStatus", { userId }, error);
    return { ok: false, message: "We could not update this user's access." };
  }
  if (!updated) {
    logServiceError("setUserActiveStatus", { userId }, "update matched 0 rows");
    return { ok: false, message: "This user's access could not be updated — they may have been removed or changed by someone else. Refresh and try again." };
  }

  await logUserActivity({
    actorId: actingAdmin.id,
    actionType: isActive ? "user_activated" : "user_deactivated",
    targetUserId: userId,
    description: `${isActive ? "Activated" : "Deactivated"} ${target.full_name || target.email}.`,
  });

  return { ok: true, message: isActive ? "User activated." : "User deactivated." };
}

export async function removeUserAccess(userId: string, actingAdmin: Profile): Promise<UserActionResult> {
  if (userId === actingAdmin.id) {
    return { ok: false, message: "You cannot remove your own access." };
  }

  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id,role,is_active,full_name,email")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) {
    logServiceError("removeUserAccess", { userId }, fetchError);
    return { ok: false, message: "We could not look up this user. Try again shortly." };
  }
  if (!target) {
    return { ok: false, message: "We could not find that user. They may have been removed." };
  }

  if (target.role === "admin" && target.is_active && !(await hasOtherActiveAdmin(userId))) {
    return { ok: false, message: "At least one active administrator is required." };
  }

  const { data: updated, error } = await supabase.from("profiles").update({ is_active: false }).eq("id", userId).select("id").maybeSingle();

  if (error) {
    logServiceError("removeUserAccess", { userId }, error);
    return { ok: false, message: "We could not remove access for this user." };
  }
  if (!updated) {
    logServiceError("removeUserAccess", { userId }, "update matched 0 rows");
    return { ok: false, message: "This user's access could not be removed — they may have already been removed by someone else. Refresh and try again." };
  }

  await logUserActivity({
    actorId: actingAdmin.id,
    actionType: "access_removed",
    targetUserId: userId,
    description: `Removed access for ${target.full_name || target.email}.`,
  });

  return { ok: true, message: `Access removed for ${target.full_name || target.email}.` };
}

export async function resendInvitation(userId: string, actingAdmin: Profile): Promise<UserActionResult> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, message: "Resending invitations requires Supabase admin configuration." };
  }

  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) {
    logServiceError("resendInvitation", { userId }, fetchError);
    return { ok: false, message: "We could not look up this user. Try again shortly." };
  }
  if (!target) {
    return { ok: false, message: "We could not find that user. They may have been removed." };
  }

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authUser?.user) {
    logServiceError("resendInvitation", { userId }, authError ?? "auth user not found");
    return { ok: false, message: "We could not find this user's account." };
  }

  const confirmedAt = authUser.user.confirmed_at ?? authUser.user.email_confirmed_at ?? null;
  if (confirmedAt) {
    return { ok: false, message: "This user has already confirmed their account. Resend is not available." };
  }

  // Re-invoking inviteUserByEmail (the admin API's /invite endpoint) is the
  // documented way to resend an unconfirmed invite. This is deliberately not
  // supabase.auth.resend(), whose `type` is restricted to "signup" |
  // "email_change" and does not support "invite" at all.
  const origin = getSiteOrigin();
  if (!origin.ok) {
    return { ok: false, message: "Recovery Hub is not fully configured (missing site URL). Contact an administrator before resending invitations." };
  }
  const redirectTo = `${origin.origin}/reset-password`;
  const { error } = await admin.auth.admin.inviteUserByEmail(target.email, {
    data: { full_name: target.full_name },
    redirectTo,
  });

  if (error) {
    logServiceError("resendInvitation", { userId, email: target.email }, error);
    return { ok: false, message: "We could not resend the invitation. Try again shortly." };
  }

  await logUserActivity({
    actorId: actingAdmin.id,
    actionType: "invitation_resent",
    targetUserId: userId,
    description: `Resent invitation to ${target.email}.`,
  });

  return { ok: true, message: `Invitation resent to ${target.email}.` };
}
