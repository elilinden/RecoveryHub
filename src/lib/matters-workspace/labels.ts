import type {
  AssessmentLevel,
  DeadlineType,
  EvidenceStatus,
  InsuranceStatus,
  IntakeStatus,
  MatterEventType,
  MatterStage,
  MatterType,
  MatterWarning,
  PriorityLevel,
  TaskStatus,
} from "@/lib/matters-workspace/types";

export const matterStageLabels: Record<MatterStage, string> = {
  new_referral: "New referral",
  initial_review: "Initial review",
  investigation: "Investigation",
  ready_for_demand: "Ready for demand",
  demand_pending: "Demand pending",
  negotiation: "Negotiation",
  arbitration_review: "Arbitration review",
  litigation_review: "Litigation review",
  recovery_received: "Recovery received",
  closed: "Closed",
};

export const priorityLabels: Record<PriorityLevel, string> = {
  urgent: "Urgent",
  high: "High priority",
  normal: "Normal",
  low: "Low priority",
};

export const intakeStatusLabels: Record<IntakeStatus, string> = {
  draft: "Draft intake",
  in_progress: "Intake in progress",
  complete: "Intake complete",
};

export const matterTypeLabels: Record<MatterType, string> = {
  auto_subrogation: "Auto subrogation",
  property_damage: "Property damage",
  workers_compensation_recovery: "Workers' compensation recovery",
  health_plan_recovery: "Health-plan recovery",
  commercial_loss: "Commercial loss",
  product_related_loss: "Product-related loss",
  construction_loss: "Construction loss",
  insurance_defense: "Insurance defense",
  other: "Other",
};

export const insuranceStatusLabels: Record<InsuranceStatus, string> = {
  confirmed_coverage: "Confirmed coverage",
  identified_unconfirmed: "Insurance identified but unconfirmed",
  no_insurance_identified: "No insurance identified",
  uninsured: "Uninsured",
  unknown: "Unknown",
};

export const assessmentLabels: Record<AssessmentLevel, string> = {
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak",
  unknown: "Unknown",
};

export const evidenceStatusLabels: Record<EvidenceStatus, string> = {
  received: "Received",
  requested: "Requested",
  missing: "Missing",
  not_available: "Not available",
  not_applicable: "Not applicable",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  blocked: "Blocked",
  completed: "Completed",
  canceled: "Canceled",
};

export const deadlineTypeLabels: Record<DeadlineType, string> = {
  statute_of_limitations: "Statute of limitations",
  contractual_limitation: "Contractual limitation",
  arbitration: "Arbitration",
  notice: "Notice",
  preservation: "Preservation",
  filing: "Filing",
  discovery: "Discovery",
  hearing: "Hearing",
  trial: "Trial",
  other: "Other",
};

export const matterEventLabels: Record<MatterEventType, string> = {
  referral_received: "Referral received",
  initial_review_completed: "Initial review completed",
  investigation_started: "Investigation started",
  document_requested: "Document requested",
  document_received: "Document received",
  demand_ready: "Demand ready",
  demand_sent: "Demand sent",
  response_received: "Response received",
  offer_received: "Offer received",
  authority_requested: "Authority requested",
  authority_received: "Authority received",
  arbitration_filed: "Arbitration filed",
  lawsuit_filed: "Lawsuit filed",
  hearing_scheduled: "Hearing scheduled",
  recovery_received: "Recovery received",
  matter_closed: "Matter closed",
  other: "Other event",
};

export const warningLabels: Record<MatterWarning, string> = {
  overdue_next_action: "Overdue next action",
  deadline_within_30: "Deadline within 30 days",
  unverified_statute_deadline: "Unverified statute deadline",
  missing_next_action: "Missing next action",
  stale_matter: "Stale matter",
  draft_intake: "Draft intake",
  missing_information: "Missing information",
  missing_required_evidence: "Missing required evidence",
};

export function labelFromValue(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function daysBetweenDates(from: string | null, to = new Date()) {
  if (!from) return null;
  const fromDate = new Date(from);
  if (Number.isNaN(fromDate.getTime())) return null;
  return Math.floor((to.getTime() - fromDate.getTime()) / 86_400_000);
}

export function daysUntilDate(date: string | null, from = new Date()) {
  if (!date) return null;
  const target = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const basis = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  return Math.ceil((target.getTime() - basis.getTime()) / 86_400_000);
}
