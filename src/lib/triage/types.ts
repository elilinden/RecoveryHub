import type {
  AssessmentLevel,
  DeadlineItem,
  EvidenceItem,
  EvidenceStatus,
  InsuranceStatus,
  IntakeStatus,
  MatterEventType,
  MatterListItem,
  MatterStage,
  MatterType,
  PriorityLevel,
  TaskItem,
  TimelineItem,
} from "@/lib/matters-workspace/types";

export type TriageSeverity = "critical" | "high" | "medium" | "low" | "informational";

export type TriageFlagType =
  | "overdue_next_action"
  | "missing_next_action"
  | "urgent_statute_deadline"
  | "upcoming_statute_deadline"
  | "unverified_statute_deadline"
  | "missing_statute_deadline"
  | "stale_matter"
  | "new_referral_unreviewed"
  | "missing_information"
  | "ready_for_demand"
  | "awaiting_response"
  | "awaiting_client"
  | "overdue_task"
  | "overdue_deadline"
  | "missing_assignment"
  | "draft_intake"
  | "financial_information_missing"
  | "responsible_party_missing"
  | "insurance_status_unknown"
  | "liability_assessment_unknown"
  | "payment_documentation_missing"
  | "custom";

export type TriageCategory = "follow_up" | "missing_information" | "deadline" | "readiness" | "referral" | "task";

export type TriageSettingKey =
  | "urgent_statute_days"
  | "upcoming_statute_days"
  | "stale_matter_days"
  | "overdue_response_days"
  | "new_referral_review_days"
  | "demand_follow_up_days"
  | "missing_next_action_is_flagged"
  | "unverified_deadline_is_flagged"
  | "ready_for_demand_required_evidence"
  | "ready_for_demand_allowed_liability_values"
  | "ready_for_demand_allowed_insurance_values";

export type TriageSettings = {
  urgentStatuteDays: number;
  upcomingStatuteDays: number;
  staleMatterDays: number;
  overdueResponseDays: number;
  newReferralReviewDays: number;
  demandFollowUpDays: number;
  missingNextActionIsFlagged: boolean;
  unverifiedDeadlineIsFlagged: boolean;
  readyForDemandRequiredEvidence: string[];
  readyForDemandAllowedLiabilityValues: AssessmentLevel[];
  readyForDemandAllowedInsuranceValues: InsuranceStatus[];
};

export type TriageMatterSnapshot = {
  id: string;
  matterName: string;
  carrierName: string;
  matterType: MatterType;
  intakeStatus: IntakeStatus;
  stage: MatterStage;
  priority: PriorityLevel;
  isArchived: boolean;
  dateReferred: string | null;
  createdAt: string | null;
  lastUpdated: string;
  lastAutosavedAt: string | null;
  amountSought: number;
  amountPaid: number;
  insuranceStatus: InsuranceStatus;
  liabilityAssessment: AssessmentLevel;
  statuteDeadline: string | null;
  statuteDeadlineVerified: boolean;
  nextAction: string | null;
  nextActionDueDate: string | null;
  assignedFirmUser: string;
  assignedAttorneyName: string | null;
  assignedStaffName: string | null;
  assignedAdjusterName: string | null;
  daysSinceLastSubstantiveActivity: number | null;
  lastSubstantiveActivityAt: string | null;
  primaryPartyNames: string[];
  evidence: EvidenceItem[];
  tasks: TaskItem[];
  deadlines: DeadlineItem[];
  timeline: TimelineItem[];
};

export type TriageFlag = {
  id?: string;
  matterId: string;
  ruleKey: string;
  flagType: TriageFlagType;
  severity: TriageSeverity;
  category: TriageCategory;
  title: string;
  explanation: string;
  suggestedAction: string;
  relevantDate: string | null;
  relevantUser: string | null;
  detectedAt: string;
  lastEvaluatedAt: string;
  resolvedAt: string | null;
  dismissedUntil: string | null;
  resolutionReason: string | null;
  canSnooze: boolean;
  canOverride: boolean;
  isLegalWarning: boolean;
  metadata: Record<string, string | number | boolean | null>;
};

export type TriageEvaluation = {
  matterId: string;
  evaluatedAt: string;
  flags: TriageFlag[];
};

export type TriageRule = {
  key: string;
  flagType: TriageFlagType;
  category: TriageCategory;
  title: string;
  isLegalWarning: boolean;
  canSnooze: boolean;
  canOverride: boolean;
  evaluate: (snapshot: TriageMatterSnapshot, settings: TriageSettings, now: Date) => Omit<TriageFlag, "matterId" | "ruleKey" | "flagType" | "category" | "title" | "detectedAt" | "lastEvaluatedAt" | "resolvedAt" | "dismissedUntil" | "resolutionReason" | "canSnooze" | "canOverride" | "isLegalWarning"> | null;
};

export function createSnapshotFromListItem(item: MatterListItem): TriageMatterSnapshot {
  return {
    id: item.id,
    matterName: item.matterName,
    carrierName: item.carrierName,
    matterType: item.matterType,
    intakeStatus: item.intakeStatus,
    stage: item.stage,
    priority: item.priority,
    isArchived: item.isArchived,
    dateReferred: item.lastUpdated,
    createdAt: item.lastUpdated,
    lastUpdated: item.lastUpdated,
    lastAutosavedAt: item.lastAutosavedAt,
    amountSought: item.amountSought,
    amountPaid: item.amountSought,
    insuranceStatus: item.insuranceStatus,
    liabilityAssessment: item.liabilityAssessment,
    statuteDeadline: item.statuteDeadline,
    statuteDeadlineVerified: item.statuteDeadlineVerified,
    nextAction: item.nextAction,
    nextActionDueDate: item.nextActionDueDate,
    assignedFirmUser: item.assignedFirmUser,
    assignedAttorneyName: item.assignedAttorneyName,
    assignedStaffName: item.assignedStaffName,
    assignedAdjusterName: item.assignedAdjusterName,
    daysSinceLastSubstantiveActivity: item.daysSinceLastSubstantiveActivity,
    lastSubstantiveActivityAt: item.lastSubstantiveActivityAt,
    primaryPartyNames: item.primaryPartyNames,
    evidence: [],
    tasks: [],
    deadlines: [],
    timeline: [],
  };
}

export function createSnapshotFromDetail(item: MatterListItem & {
  dateReferred?: string | null;
  amountPaid?: number;
  evidence?: EvidenceItem[];
  tasks?: TaskItem[];
  deadlines?: DeadlineItem[];
  timeline?: TimelineItem[];
}): TriageMatterSnapshot {
  return {
    ...createSnapshotFromListItem(item),
    dateReferred: item.dateReferred ?? item.lastUpdated,
    createdAt: item.dateReferred ?? item.lastUpdated,
    amountPaid: item.amountPaid ?? item.amountSought,
    evidence: item.evidence ?? [],
    tasks: item.tasks ?? [],
    deadlines: item.deadlines ?? [],
    timeline: item.timeline ?? [],
  };
}

export type MeaningfulEventType = Extract<
  MatterEventType,
  "initial_review_completed" | "document_received" | "demand_ready" | "demand_sent" | "response_received" | "offer_received" | "authority_requested" | "authority_received" | "recovery_received" | "matter_closed"
>;

export const evidenceStatusCountsAsComplete: EvidenceStatus[] = ["received", "not_available", "not_applicable"];
