import type { FollowUpReason } from "@/lib/types";

export type ProfileRole = "admin" | "partner" | "attorney" | "staff" | "billing" | "read_only";
export type IntakeStatus = "draft" | "in_progress" | "complete";
export type MatterStage =
  | "new_referral"
  | "initial_review"
  | "investigation"
  | "ready_for_demand"
  | "demand_pending"
  | "negotiation"
  | "arbitration_review"
  | "litigation_review"
  | "recovery_received"
  | "closed";
export type PriorityLevel = "urgent" | "high" | "normal" | "low";
export type MatterType =
  | "auto_subrogation"
  | "property_damage"
  | "workers_compensation_recovery"
  | "health_plan_recovery"
  | "commercial_loss"
  | "product_related_loss"
  | "construction_loss"
  | "insurance_defense"
  | "other";
export type InsuranceStatus = "confirmed_coverage" | "identified_unconfirmed" | "no_insurance_identified" | "uninsured" | "unknown";
export type AssessmentLevel = "strong" | "moderate" | "weak" | "unknown";
export type TaskStatus = "not_started" | "in_progress" | "blocked" | "completed" | "canceled";
export type EvidenceStatus = "received" | "requested" | "missing" | "not_available" | "not_applicable";
export type DeadlineType =
  | "statute_of_limitations"
  | "contractual_limitation"
  | "arbitration"
  | "notice"
  | "preservation"
  | "filing"
  | "discovery"
  | "hearing"
  | "trial"
  | "other";
export type MatterEventType =
  | "referral_received"
  | "initial_review_completed"
  | "investigation_started"
  | "document_requested"
  | "document_received"
  | "demand_ready"
  | "demand_sent"
  | "response_received"
  | "offer_received"
  | "authority_requested"
  | "authority_received"
  | "arbitration_filed"
  | "lawsuit_filed"
  | "hearing_scheduled"
  | "recovery_received"
  | "matter_closed"
  | "other";
export type MatterEventSource = "manual" | "system" | "import" | "integration";

export type MatterWarning =
  | "overdue_next_action"
  | "deadline_within_30"
  | "unverified_statute_deadline"
  | "missing_next_action"
  | "stale_matter"
  | "draft_intake"
  | "missing_information"
  | "missing_required_evidence";

export type WorkspaceSavedView = {
  id: string;
  name: string;
  scope: "personal" | "shared" | "system";
  description: string;
  filterConfiguration: MattersQueryState;
  canModify: boolean;
};

export type MattersQueryState = {
  q: string;
  page: number;
  pageSize: number;
  sort: MattersSort;
  view: string;
  filters: {
    carrier: string;
    adjuster: string;
    matterType: string;
    stage: string;
    priority: string;
    intakeStatus: string;
    jurisdiction: string;
    attorney: string;
    staff: string;
    minAmount: string;
    maxAmount: string;
    amountRecovered: boolean;
    noAmountSought: boolean;
    nextAction: string;
    overdueNextAction: boolean;
    missingNextAction: boolean;
    draftIntake: boolean;
    readyForDemand: boolean;
    awaitingClient: boolean;
    closed: boolean;
    archived: boolean;
    deadlineWindow: "" | "30" | "60" | "90";
    overdueDeadline: boolean;
    missingStatuteDeadline: boolean;
    unverifiedDeadline: boolean;
    staleDays: "" | "14" | "30" | "60" | "custom";
    customStaleDays: string;
    missingAdjuster: boolean;
    missingResponsibleParty: boolean;
    unknownInsurance: boolean;
    unknownLiability: boolean;
    missingPaymentDocumentation: boolean;
    missingRequiredEvidence: boolean;
  };
};

export type MattersSort =
  | "needs_attention"
  | "updated_desc"
  | "updated_asc"
  | "date_referred"
  | "statute_deadline"
  | "next_action_due"
  | "amount_sought"
  | "amount_recovered"
  | "activity_age"
  | "matter_name"
  | "carrier"
  | "priority";

export type MatterListItem = {
  id: string;
  matterName: string;
  carrierName: string;
  carrierClaimNumber: string | null;
  firmMatterNumber: string | null;
  matterType: MatterType;
  intakeStatus: IntakeStatus;
  currentIntakeStep: number;
  lastAutosavedAt: string | null;
  assignedAdjusterName: string | null;
  assignedAttorneyName: string | null;
  assignedStaffName: string | null;
  assignedFirmUser: string;
  amountSought: number;
  amountRecovered: number;
  stage: MatterStage;
  priority: PriorityLevel;
  nextAction: string | null;
  nextActionDueDate: string | null;
  statuteDeadline: string | null;
  statuteDeadlineVerified: boolean;
  daysSinceLastSubstantiveActivity: number | null;
  lastSubstantiveActivityAt: string | null;
  lastUpdated: string;
  jurisdiction: string | null;
  insuranceStatus: InsuranceStatus;
  liabilityAssessment: AssessmentLevel;
  collectabilityAssessment: AssessmentLevel;
  isArchived: boolean;
  warnings: MatterWarning[];
  followUpReasons: FollowUpReason[];
  primaryPartyNames: string[];
};

export type MattersListResult = {
  items: MatterListItem[];
  totalCount: number;
  rangeStart: number;
  rangeEnd: number;
  query: MattersQueryState;
};

export type WorkspaceFilterOptions = {
  carriers: Array<{ id: string; name: string }>;
  adjusters: Array<{ id: string; name: string; carrierId: string }>;
  users: Array<{ id: string; name: string; role: ProfileRole }>;
  jurisdictions: string[];
  nextActions: string[];
};

export type MatterDetail = MatterListItem & {
  carrierId: string | null;
  assignedAdjusterId: string | null;
  carrierSupervisorName: string | null;
  carrierSupervisorEmail: string | null;
  carrierSupervisorPhone: string | null;
  adjusterEmail: string | null;
  adjusterPhone: string | null;
  adjusterDepartment: string | null;
  assignedAttorneyId: string | null;
  assignedStaffId: string | null;
  dateReferred: string | null;
  dateOfLoss: string | null;
  venue: string | null;
  adverseInsurer: string | null;
  adverseClaimNumber: string | null;
  adverseAdjuster: string | null;
  liabilitySummary: string | null;
  currentStatusSummary: string | null;
  statusSummaryUpdatedAt: string | null;
  statusSummaryUpdatedByName: string | null;
  internalNotes: string | null;
  canViewInternalNotes: boolean;
  amountPaid: number;
  deductible: number;
  anticipatedAdditionalPayments: number;
  recoverableExpenses: number;
  estimatedLegalCost: number;
  matterSpecificData: Record<string, unknown>;
  assignments: MatterAssignment[];
  parties: MatterParty[];
  evidence: EvidenceItem[];
  deadlines: DeadlineItem[];
  tasks: TaskItem[];
  timeline: TimelineItem[];
  permissions: MatterPermissions;
  closedAt: string | null;
  closedReason: string | null;
  archivedAt: string | null;
};

export type MatterPermissions = {
  canEditMatter: boolean;
  canManageAssignments: boolean;
  canManageParties: boolean;
  canManageEvidence: boolean;
  canManageDeadlines: boolean;
  canVerifyDeadlines: boolean;
  canManageTasks: boolean;
  canAddEvents: boolean;
  canClose: boolean;
  canReopen: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canViewInternalNotes: boolean;
  canManageSharedViews: boolean;
};

export type MatterAssignment = {
  id: string;
  profileId: string;
  profileName: string;
  role: string;
};

export type MatterParty = {
  id: string;
  role: string;
  isPrimary: boolean;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type EvidenceItem = {
  id: string;
  evidenceType: string;
  status: EvidenceStatus;
  dateRequested: string | null;
  dateReceived: string | null;
  notes: string | null;
  updatedAt: string;
};

export type DeadlineItem = {
  id: string;
  title: string;
  deadlineType: DeadlineType;
  deadlineDate: string;
  isVerified: boolean;
  verifiedByName: string | null;
  verifiedAt: string | null;
  assignedToName: string | null;
  reminderDate: string | null;
  notes: string | null;
};

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  assignedToName: string | null;
  dueDate: string | null;
  priority: PriorityLevel;
  status: TaskStatus;
  completedAt: string | null;
  createdByName: string | null;
};

export type TimelineItem = {
  id: string;
  kind: "event" | "activity";
  occurredAt: string;
  label: string;
  description: string;
  actorName: string | null;
  actorId: string | null;
  source: MatterEventSource | "system_activity";
  isStruckThrough: boolean;
};
