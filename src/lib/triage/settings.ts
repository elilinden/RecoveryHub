import type { TriageSettingKey, TriageSettings } from "@/lib/triage/types";
import type { Json } from "@/lib/supabase/database.types";

export const defaultTriageSettings: TriageSettings = {
  urgentStatuteDays: 30,
  upcomingStatuteDays: 90,
  staleMatterDays: 30,
  overdueResponseDays: 14,
  newReferralReviewDays: 3,
  demandFollowUpDays: 14,
  missingNextActionIsFlagged: true,
  unverifiedDeadlineIsFlagged: true,
  readyForDemandRequiredEvidence: [
    "payment_ledger",
    "police_or_incident_report",
    "repair_estimate",
    "photographs",
    "insurance_information",
  ],
  readyForDemandAllowedLiabilityValues: ["strong", "moderate"],
  readyForDemandAllowedInsuranceValues: ["confirmed_coverage", "identified_unconfirmed"],
};

export const triageSettingDefinitions: Array<{
  key: TriageSettingKey;
  label: string;
  description: string;
  inputType: "number" | "boolean";
}> = [
  {
    key: "urgent_statute_days",
    label: "Urgent statute window",
    description: "Flags recorded statute deadlines at or inside this many days as urgent.",
    inputType: "number",
  },
  {
    key: "upcoming_statute_days",
    label: "Upcoming statute window",
    description: "Flags recorded statute deadlines outside urgent status but inside this many days.",
    inputType: "number",
  },
  {
    key: "stale_matter_days",
    label: "Stale matter period",
    description: "Flags active matters with no substantive activity for this many days.",
    inputType: "number",
  },
  {
    key: "overdue_response_days",
    label: "Outside response follow-up",
    description: "Flags demands, requests, or authority requests with no response after this many days.",
    inputType: "number",
  },
  {
    key: "new_referral_review_days",
    label: "New referral review period",
    description: "Flags completed intakes that remain in New Referral beyond this many days.",
    inputType: "number",
  },
  {
    key: "demand_follow_up_days",
    label: "Demand follow-up period",
    description: "Used when no explicit follow-up date exists after a demand is sent.",
    inputType: "number",
  },
  {
    key: "missing_next_action_is_flagged",
    label: "Flag missing next actions",
    description: "Shows active matters without a complete next action in follow-up queues.",
    inputType: "boolean",
  },
  {
    key: "unverified_deadline_is_flagged",
    label: "Flag unverified statute dates",
    description: "Shows entered statute deadlines that still need authorized attorney verification.",
    inputType: "boolean",
  },
];

export function settingKeyToProperty(key: TriageSettingKey): keyof TriageSettings {
  const map: Record<TriageSettingKey, keyof TriageSettings> = {
    urgent_statute_days: "urgentStatuteDays",
    upcoming_statute_days: "upcomingStatuteDays",
    stale_matter_days: "staleMatterDays",
    overdue_response_days: "overdueResponseDays",
    new_referral_review_days: "newReferralReviewDays",
    demand_follow_up_days: "demandFollowUpDays",
    missing_next_action_is_flagged: "missingNextActionIsFlagged",
    unverified_deadline_is_flagged: "unverifiedDeadlineIsFlagged",
    ready_for_demand_required_evidence: "readyForDemandRequiredEvidence",
    ready_for_demand_allowed_liability_values: "readyForDemandAllowedLiabilityValues",
    ready_for_demand_allowed_insurance_values: "readyForDemandAllowedInsuranceValues",
  };
  return map[key];
}

export function parseTriageSettingValue(key: TriageSettingKey, value: Json): TriageSettings[keyof TriageSettings] {
  const property = settingKeyToProperty(key);
  const fallback = defaultTriageSettings[property];
  if (typeof fallback === "number") return typeof value === "number" ? Math.max(1, Math.floor(value)) : fallback;
  if (typeof fallback === "boolean") return typeof value === "boolean" ? value : fallback;
  if (Array.isArray(fallback) && Array.isArray(value)) return value.filter((item): item is string => typeof item === "string") as TriageSettings[keyof TriageSettings];
  return fallback;
}

export function serializeTriageSettingValue(value: TriageSettings[keyof TriageSettings]): Json {
  if (Array.isArray(value)) return value;
  return value;
}
