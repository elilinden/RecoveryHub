"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { submitWithActionFeedback } from "@/lib/action-feedback/server";
import { getCurrentProfile, type Profile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loadMatterDetail } from "@/lib/matters-workspace/data";
import { createSnapshotFromDetail } from "@/lib/triage/types";
import { evaluateMatterTriage } from "@/lib/triage/rules";
import {
  loadTriageSettings,
  overrideMatterFlag,
  snoozeMatterFlag,
  syncMatterFlags,
  updateTriageSettings,
} from "@/lib/triage/data";
import { loadDashboardMatterSnapshots } from "@/lib/dashboard/data";

export type TriageActionResult = { ok: true; message: string } | { ok: false; message: string; fieldErrors?: Record<string, string> };

const triageSettingsSchema = z.object({
  urgentStatuteDays: z.coerce.number().int().min(1).max(365),
  upcomingStatuteDays: z.coerce.number().int().min(1).max(730),
  staleMatterDays: z.coerce.number().int().min(1).max(365),
  overdueResponseDays: z.coerce.number().int().min(1).max(120),
  newReferralReviewDays: z.coerce.number().int().min(1).max(60),
  demandFollowUpDays: z.coerce.number().int().min(1).max(120),
  missingNextActionIsFlagged: z.string().optional(),
  unverifiedDeadlineIsFlagged: z.string().optional(),
});

const snoozeSchema = z.object({
  flagId: z.string().trim().min(1),
  matterId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(300),
  dismissedUntil: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const overrideSchema = z.object({
  flagId: z.string().trim().min(1),
  matterId: z.string().trim().min(1),
  ruleKey: z.string().trim().min(1),
  reason: z.string().trim().min(8).max(500),
  expiresAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

async function getActionProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: "development-profile",
      email: "eli.linden@example.test",
      full_name: "Eli Linden",
      role: "attorney",
      job_title: "Attorney",
      avatar_url: null,
      is_active: true,
    };
  }
  return getCurrentProfile();
}

function parseForm<T>(schema: z.ZodType<T>, formData: FormData): { ok: true; data: T } | { ok: false; result: TriageActionResult } {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
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

export async function updateTriageSettingsAction(formData: FormData): Promise<TriageActionResult> {
  const parsed = parseForm(triageSettingsSchema, formData);
  if (!parsed.ok) return parsed.result;
  const profile = await getActionProfile();
  if (!profile || !profile.is_active) return { ok: false, message: "Your session has expired. Please sign in again." };

  const result = await updateTriageSettings(profile, {
    urgentStatuteDays: parsed.data.urgentStatuteDays,
    upcomingStatuteDays: parsed.data.upcomingStatuteDays,
    staleMatterDays: parsed.data.staleMatterDays,
    overdueResponseDays: parsed.data.overdueResponseDays,
    newReferralReviewDays: parsed.data.newReferralReviewDays,
    demandFollowUpDays: parsed.data.demandFollowUpDays,
    missingNextActionIsFlagged: parsed.data.missingNextActionIsFlagged === "on",
    unverifiedDeadlineIsFlagged: parsed.data.unverifiedDeadlineIsFlagged === "on",
  });
  return result.ok ? { ok: true, message: result.message } : { ok: false, message: result.message };
}

export async function submitUpdateTriageSettingsAction(formData: FormData) {
  await submitWithActionFeedback(updateTriageSettingsAction, formData);
}

export async function refreshDashboardTriageAction(formData: FormData): Promise<TriageActionResult> {
  const profile = await getActionProfile();
  if (!profile || !profile.is_active) return { ok: false, message: "Your session has expired. Please sign in again." };
  const mode = String(formData.get("mode") ?? "my");
  if (mode === "firm" && profile.role !== "admin" && profile.role !== "partner") {
    return { ok: false, message: "Only a partner or administrator may refresh firm-wide triage." };
  }

  const { settings } = await loadTriageSettings(profile);
  const snapshots = await loadDashboardMatterSnapshots({ profile, mode: mode === "firm" ? "firm" : "my" });
  const now = new Date();
  const evaluations = snapshots.map((snapshot) => evaluateMatterTriage(snapshot, settings, now));
  const result = await syncMatterFlags(evaluations, profile);
  revalidatePath("/dashboard");
  revalidatePath("/matters");
  return result.ok ? { ok: true, message: `${result.updatedCount} triage flag updates processed.` } : { ok: false, message: result.message };
}

export async function submitRefreshDashboardTriageAction(formData: FormData) {
  await submitWithActionFeedback(refreshDashboardTriageAction, formData);
}

export async function recheckMatterTriageAction(formData: FormData): Promise<TriageActionResult> {
  const profile = await getActionProfile();
  if (!profile || !profile.is_active) return { ok: false, message: "Your session has expired. Please sign in again." };
  const matterId = String(formData.get("matterId") ?? "");
  if (!matterId) return { ok: false, message: "Matter id is required." };
  const matter = await loadMatterDetail(matterId, profile);
  const { settings } = await loadTriageSettings(profile);
  const evaluation = evaluateMatterTriage(createSnapshotFromDetail(matter), settings, new Date());
  const result = await syncMatterFlags([evaluation], profile);
  revalidatePath(`/matters/${matterId}`);
  revalidatePath("/dashboard");
  return result.ok ? { ok: true, message: "Matter triage refreshed." } : { ok: false, message: result.message };
}

export async function submitRecheckMatterTriageAction(formData: FormData) {
  await submitWithActionFeedback(recheckMatterTriageAction, formData);
}

export async function snoozeTriageFlagAction(formData: FormData): Promise<TriageActionResult> {
  const parsed = parseForm(snoozeSchema, formData);
  if (!parsed.ok) return parsed.result;
  const profile = await getActionProfile();
  if (!profile || !profile.is_active) return { ok: false, message: "Your session has expired. Please sign in again." };
  const result = await snoozeMatterFlag({ ...parsed.data, profile });
  return result.ok ? { ok: true, message: result.message } : { ok: false, message: result.message };
}

export async function submitSnoozeTriageFlagAction(formData: FormData) {
  await submitWithActionFeedback(snoozeTriageFlagAction, formData);
}

export async function overrideTriageFlagAction(formData: FormData): Promise<TriageActionResult> {
  const parsed = parseForm(overrideSchema, formData);
  if (!parsed.ok) return parsed.result;
  const profile = await getActionProfile();
  if (!profile || !profile.is_active) return { ok: false, message: "Your session has expired. Please sign in again." };
  const result = await overrideMatterFlag({
    ...parsed.data,
    expiresAt: parsed.data.expiresAt || null,
    profile,
  });
  return result.ok ? { ok: true, message: result.message } : { ok: false, message: result.message };
}

export async function submitOverrideTriageFlagAction(formData: FormData) {
  await submitWithActionFeedback(overrideTriageFlagAction, formData);
}
