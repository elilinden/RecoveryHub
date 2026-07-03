import { revalidatePath } from "next/cache";

import type { Profile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { defaultTriageSettings, parseTriageSettingValue, serializeTriageSettingValue, settingKeyToProperty } from "@/lib/triage/settings";
import type { TriageEvaluation, TriageFlag, TriageSettingKey, TriageSettings } from "@/lib/triage/types";

type TriageSettingRow = {
  setting_key: TriageSettingKey;
  setting_value: Json;
  description: string;
  updated_at: string;
};

type MatterFlagRow = {
  id: string;
  matter_id: string;
  flag_type: TriageFlag["flagType"];
  rule_key: string;
  severity: TriageFlag["severity"];
  category: TriageFlag["category"];
  title: string;
  description: string;
  suggested_action: string | null;
  relevant_date: string | null;
  relevant_user_id: string | null;
  detected_at: string;
  last_evaluated_at: string;
  resolved_at: string | null;
  resolution_reason: string | null;
  dismissed_until: string | null;
  metadata: Json;
};

export type TriageSettingsResult = {
  settings: TriageSettings;
  updatedAt: string | null;
  canManage: boolean;
};

export async function loadTriageSettings(profile?: Profile): Promise<TriageSettingsResult> {
  if (!isSupabaseConfigured()) {
    return {
      settings: defaultTriageSettings,
      updatedAt: null,
      canManage: profile ? canManageTriageSettings(profile.role) : false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("triage_settings").select("setting_key,setting_value,description,updated_at");
  if (error) {
    return {
      settings: defaultTriageSettings,
      updatedAt: null,
      canManage: profile ? canManageTriageSettings(profile.role) : false,
    };
  }

  const settings = { ...defaultTriageSettings };
  const rows = (data ?? []) as unknown as TriageSettingRow[];
  for (const row of rows) {
    const property = settingKeyToProperty(row.setting_key);
    Object.assign(settings, { [property]: parseTriageSettingValue(row.setting_key, row.setting_value) });
  }

  return {
    settings,
    updatedAt: rows.map((row) => row.updated_at).sort().at(-1) ?? null,
    canManage: profile ? canManageTriageSettings(profile.role) : false,
  };
}

export async function updateTriageSettings(profile: Profile, settings: Partial<TriageSettings>) {
  if (!canManageTriageSettings(profile.role)) return { ok: false as const, message: "Only a partner or administrator may update triage settings." };
  if (!isSupabaseConfigured()) return { ok: true as const, message: "Triage settings updated in development mode." };

  const supabase = await createClient();
  const rows = Object.entries(settings).map(([property, value]) => {
    const key = propertyToSettingKey(property as keyof TriageSettings);
    return {
      setting_key: key,
      setting_value: serializeTriageSettingValue(value as TriageSettings[keyof TriageSettings]),
      description: settingDescription(key),
      updated_by: profile.id,
    };
  });

  if (rows.length === 0) return { ok: true as const, message: "No triage settings changed." };
  const { error } = await supabase.from("triage_settings").upsert(rows, { onConflict: "setting_key" });
  if (error) return { ok: false as const, message: "We could not update triage settings." };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true as const, message: "Triage settings updated." };
}

export async function loadActiveMatterFlags(matterIds: string[]): Promise<Map<string, TriageFlag[]>> {
  const grouped = new Map<string, TriageFlag[]>();
  if (!isSupabaseConfigured() || matterIds.length === 0) return grouped;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matter_flags")
    .select("*")
    .in("matter_id", matterIds)
    .is("resolved_at", null)
    .order("severity")
    .order("relevant_date", { nullsFirst: false });

  if (error) return grouped;
  for (const row of (data ?? []) as unknown as MatterFlagRow[]) {
    const flag = mapMatterFlagRow(row);
    grouped.set(flag.matterId, [...(grouped.get(flag.matterId) ?? []), flag]);
  }
  return grouped;
}

export async function loadRecentResolvedMatterFlags(matterId: string, limit = 5): Promise<TriageFlag[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matter_flags")
    .select("*")
    .eq("matter_id", matterId)
    .not("resolved_at", "is", null)
    .order("resolved_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return ((data ?? []) as unknown as MatterFlagRow[]).map(mapMatterFlagRow);
}

export async function syncMatterFlags(evaluations: TriageEvaluation[], profile: Profile | null) {
  if (!isSupabaseConfigured()) return { ok: true as const, message: "Triage evaluated in development mode.", updatedCount: evaluations.length };
  const supabase = await createClient();
  let updatedCount = 0;

  for (const evaluation of evaluations) {
    const { data } = await supabase
      .from("matter_flags")
      .select("*")
      .eq("matter_id", evaluation.matterId)
      .is("resolved_at", null);
    const activeRows = ((data ?? []) as unknown as MatterFlagRow[]).map(mapMatterFlagRow);
    const activeByRule = new Map(activeRows.map((flag) => [flag.ruleKey, flag]));
    const evaluatedByRule = new Map(evaluation.flags.map((flag) => [flag.ruleKey, flag]));

    for (const flag of evaluation.flags) {
      const existing = activeByRule.get(flag.ruleKey);
      const values = {
        matter_id: flag.matterId,
        flag_type: flag.flagType,
        rule_key: flag.ruleKey,
        severity: flag.severity,
        category: flag.category,
        title: flag.title,
        description: flag.explanation,
        suggested_action: flag.suggestedAction,
        relevant_date: flag.relevantDate,
        last_evaluated_at: flag.lastEvaluatedAt,
        metadata: flag.metadata as Json,
      };

      if (existing?.id) {
        await supabase.from("matter_flags").update(values).eq("id", existing.id);
      } else {
        await supabase.from("matter_flags").insert({
          ...values,
          detected_at: flag.detectedAt,
        });
      }
      updatedCount += 1;
    }

    for (const active of activeRows) {
      if (evaluatedByRule.has(active.ruleKey)) continue;
      await supabase
        .from("matter_flags")
        .update({
          resolved_at: evaluation.evaluatedAt,
          resolved_by: profile?.id ?? null,
          resolution_reason: "Rule condition no longer applies.",
          last_evaluated_at: evaluation.evaluatedAt,
        })
        .eq("id", active.id ?? "");
      updatedCount += 1;
    }
  }

  return { ok: true as const, message: "Triage flags refreshed.", updatedCount };
}

export async function snoozeMatterFlag(input: {
  flagId: string;
  matterId: string;
  reason: string;
  dismissedUntil: string;
  profile: Profile;
}) {
  if (!canSnoozeFlags(input.profile.role)) return { ok: false as const, message: "You do not have permission to snooze triage reminders." };
  if (!isSupabaseConfigured()) return { ok: true as const, message: "Flag snoozed in development mode." };
  const supabase = await createClient();
  const { data } = await supabase.from("matter_flags").select("*").eq("id", input.flagId).maybeSingle();
  const flag = data ? mapMatterFlagRow(data as unknown as MatterFlagRow) : null;
  if (!flag) return { ok: false as const, message: "We could not find that triage flag." };
  if (!flag.canSnooze || flag.isLegalWarning || flag.severity === "critical") {
    return { ok: false as const, message: "Critical legal warnings cannot be casually snoozed." };
  }
  const { error } = await supabase
    .from("matter_flags")
    .update({
      dismissed_until: `${input.dismissedUntil}T12:00:00.000Z`,
      metadata: { ...flag.metadata, snoozeReason: input.reason, snoozedBy: input.profile.id } as Json,
    })
    .eq("id", input.flagId)
    .eq("matter_id", input.matterId);
  if (error) return { ok: false as const, message: "We could not snooze that triage flag." };
  revalidatePath("/dashboard");
  revalidatePath(`/matters/${input.matterId}`);
  return { ok: true as const, message: "Triage reminder snoozed." };
}

export async function overrideMatterFlag(input: {
  flagId: string;
  matterId: string;
  ruleKey: string;
  reason: string;
  expiresAt: string | null;
  profile: Profile;
}) {
  if (!canOverrideFlags(input.profile.role)) return { ok: false as const, message: "Only an attorney, partner, or administrator may record a triage override." };
  if (!isSupabaseConfigured()) return { ok: true as const, message: "Override recorded in development mode." };
  const supabase = await createClient();
  const { error } = await supabase.from("matter_flag_overrides").insert({
    matter_flag_id: input.flagId,
    matter_id: input.matterId,
    rule_key: input.ruleKey,
    reason: input.reason,
    expires_at: input.expiresAt ? `${input.expiresAt}T12:00:00.000Z` : null,
    created_by: input.profile.id,
  });
  if (error) return { ok: false as const, message: "We could not record that override." };
  await supabase.from("matter_flags").update({
    metadata: { overrideReason: input.reason, overriddenBy: input.profile.id } as Json,
  }).eq("id", input.flagId);
  revalidatePath("/dashboard");
  revalidatePath(`/matters/${input.matterId}`);
  return { ok: true as const, message: "Triage override recorded." };
}

export function canManageTriageSettings(role: Profile["role"]) {
  return role === "admin" || role === "partner";
}

export function canOverrideFlags(role: Profile["role"]) {
  return role === "admin" || role === "partner" || role === "attorney";
}

export function canSnoozeFlags(role: Profile["role"]) {
  return role === "admin" || role === "partner" || role === "attorney" || role === "staff";
}

function mapMatterFlagRow(row: MatterFlagRow): TriageFlag {
  return {
    id: row.id,
    matterId: row.matter_id,
    ruleKey: row.rule_key,
    flagType: row.flag_type,
    severity: row.severity,
    category: row.category,
    title: row.title,
    explanation: row.description,
    suggestedAction: row.suggested_action ?? "Review this matter.",
    relevantDate: row.relevant_date,
    relevantUser: row.relevant_user_id,
    detectedAt: row.detected_at,
    lastEvaluatedAt: row.last_evaluated_at,
    resolvedAt: row.resolved_at,
    dismissedUntil: row.dismissed_until,
    resolutionReason: row.resolution_reason,
    canSnooze: !["critical"].includes(row.severity) && !["urgent_statute_deadline", "missing_statute_deadline", "unverified_statute_deadline", "overdue_deadline"].includes(row.flag_type),
    canOverride: true,
    isLegalWarning: ["urgent_statute_deadline", "upcoming_statute_deadline", "unverified_statute_deadline", "missing_statute_deadline", "overdue_deadline"].includes(row.flag_type),
    metadata: jsonObject(row.metadata),
  };
}

function propertyToSettingKey(property: keyof TriageSettings): TriageSettingKey {
  const entries: Array<[TriageSettingKey, keyof TriageSettings]> = [
    ["urgent_statute_days", "urgentStatuteDays"],
    ["upcoming_statute_days", "upcomingStatuteDays"],
    ["stale_matter_days", "staleMatterDays"],
    ["overdue_response_days", "overdueResponseDays"],
    ["new_referral_review_days", "newReferralReviewDays"],
    ["demand_follow_up_days", "demandFollowUpDays"],
    ["missing_next_action_is_flagged", "missingNextActionIsFlagged"],
    ["unverified_deadline_is_flagged", "unverifiedDeadlineIsFlagged"],
    ["ready_for_demand_required_evidence", "readyForDemandRequiredEvidence"],
    ["ready_for_demand_allowed_liability_values", "readyForDemandAllowedLiabilityValues"],
    ["ready_for_demand_allowed_insurance_values", "readyForDemandAllowedInsuranceValues"],
  ];
  return entries.find(([, value]) => value === property)?.[0] ?? "urgent_statute_days";
}

function settingDescription(key: TriageSettingKey) {
  const descriptions: Record<TriageSettingKey, string> = {
    urgent_statute_days: "Recorded statute deadlines at or inside this many days are treated as urgent.",
    upcoming_statute_days: "Recorded statute deadlines outside the urgent window but inside this many days are treated as upcoming.",
    stale_matter_days: "Active matters with no substantive activity for this many days are flagged as stale.",
    overdue_response_days: "Outside-party response follow-up period when no explicit response date exists.",
    new_referral_review_days: "Completed intakes remaining in New Referral beyond this many days are flagged.",
    demand_follow_up_days: "Demand follow-up period when no explicit follow-up date exists.",
    missing_next_action_is_flagged: "Whether active completed matters missing a complete next action should be flagged.",
    unverified_deadline_is_flagged: "Whether entered statute dates without authorized verification should be flagged.",
    ready_for_demand_required_evidence: "Evidence normally expected before a matter appears ready for demand review.",
    ready_for_demand_allowed_liability_values: "Liability assessment values permitted by the demand-readiness rule.",
    ready_for_demand_allowed_insurance_values: "Insurance statuses permitted by the demand-readiness rule.",
  };
  return descriptions[key];
}

function jsonObject(value: Json): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null) output[key] = item;
  }
  return output;
}
