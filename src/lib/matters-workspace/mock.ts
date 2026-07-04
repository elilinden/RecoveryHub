import { activityItems, matters } from "@/lib/mock-data";
import { daysBetweenDates, daysUntilDate } from "@/lib/matters-workspace/labels";
import type {
  DeadlineItem,
  EvidenceItem,
  MatterDetail,
  MatterListItem,
  MatterPermissions,
  TaskItem,
  TimelineItem,
  WorkspaceFilterOptions,
  WorkspaceSavedView,
} from "@/lib/matters-workspace/types";
import { defaultMattersQuery } from "@/lib/matters-workspace/query";
import type { Profile, ProfileRole } from "@/lib/data/profiles";

export const developmentPermissions: MatterPermissions = {
  canEditMatter: true,
  canManageAssignments: true,
  canManageParties: true,
  canManageEvidence: true,
  canManageDeadlines: true,
  canVerifyDeadlines: true,
  canManageTasks: true,
  canAddEvents: true,
  canClose: true,
  canReopen: true,
  canArchive: true,
  canRestore: true,
  canViewInternalNotes: true,
  canManageSharedViews: false,
};

export const developmentFilterOptions: WorkspaceFilterOptions = {
  carriers: [...new Set(matters.map((matter) => matter.carrier))].map((name) => ({ id: name, name })),
  adjusters: [...new Set(matters.map((matter) => matter.assignedAdjuster))].map((name) => ({
    id: name,
    name,
    carrierId: matters.find((matter) => matter.assignedAdjuster === name)?.carrier ?? "",
  })),
  users: [...new Set(matters.flatMap((matter) => [matter.assignedAttorney, matter.assignedPerson]))].map((name) => ({
    id: name,
    name,
    role: name === "Eli Linden" ? "attorney" : "staff" as ProfileRole,
  })),
  jurisdictions: ["Illinois", "Indiana", "Michigan", "Wisconsin"],
  nextActions: [...new Set(matters.map((matter) => matter.nextAction).filter((value): value is string => Boolean(value)))],
};

export const systemSavedViews: WorkspaceSavedView[] = [
  {
    id: "system-all-active",
    name: "All Active Matters",
    scope: "system",
    description: "Open, completed-intake matters that are not archived.",
    filterConfiguration: defaultMattersQuery,
    canModify: false,
  },
  {
    id: "needs-follow-up",
    name: "Needs Attention",
    scope: "system",
    description: "Overdue actions, urgent deadlines, stale matters, and missing information.",
    filterConfiguration: { ...defaultMattersQuery, filters: { ...defaultMattersQuery.filters, overdueNextAction: true, missingNextAction: true, staleDays: "30" } },
    canModify: false,
  },
  {
    id: "missing-information",
    name: "Missing Information",
    scope: "system",
    description: "Matters with material information gaps tracked by triage rules.",
    filterConfiguration: { ...defaultMattersQuery, filters: { ...defaultMattersQuery.filters, missingResponsibleParty: true, unknownInsurance: true, unknownLiability: true, missingPaymentDocumentation: true } },
    canModify: false,
  },
  {
    id: "system-draft-intakes",
    name: "Draft Intakes",
    scope: "system",
    description: "Incomplete intake records ready to resume.",
    filterConfiguration: { ...defaultMattersQuery, filters: { ...defaultMattersQuery.filters, draftIntake: true } },
    canModify: false,
  },
  {
    id: "upcoming-deadlines",
    name: "Upcoming Deadlines",
    scope: "system",
    description: "Matters with statute deadlines in the next 30 days.",
    filterConfiguration: { ...defaultMattersQuery, filters: { ...defaultMattersQuery.filters, deadlineWindow: "90", unverifiedDeadline: true } },
    canModify: false,
  },
  {
    id: "ready-for-demand",
    name: "Ready for Demand",
    scope: "system",
    description: "Matters in or near demand readiness for attorney confirmation.",
    filterConfiguration: { ...defaultMattersQuery, filters: { ...defaultMattersQuery.filters, readyForDemand: true } },
    canModify: false,
  },
  {
    id: "new-referrals",
    name: "New Referrals",
    scope: "system",
    description: "New referrals and draft intakes needing initial review.",
    filterConfiguration: { ...defaultMattersQuery, filters: { ...defaultMattersQuery.filters, stage: "new_referral" } },
    canModify: false,
  },
];

export const developmentMatterItems: MatterListItem[] = matters.map((matter, index) => {
  const warnings = [
    ...(matter.followUpReasons.includes("overdue_next_action") ? ["overdue_next_action" as const] : []),
    ...(matter.followUpReasons.includes("missing_next_action") ? ["missing_next_action" as const] : []),
    ...(matter.followUpReasons.includes("stale_matter") ? ["stale_matter" as const] : []),
    ...(!matter.deadlineVerified ? ["unverified_statute_deadline" as const] : []),
    ...(daysUntilDate(matter.statuteDeadline) !== null && Number(daysUntilDate(matter.statuteDeadline)) <= 30 ? ["deadline_within_30" as const] : []),
    ...(matter.stage === "Missing information" ? ["missing_information" as const] : []),
  ];

  return {
    id: matter.id,
    matterName: matter.name,
    carrierName: matter.carrier,
    carrierClaimNumber: matter.claimNumber,
    firmMatterNumber: `RH-2026-${String(index + 100).padStart(4, "0")}`,
    matterType: matter.type.toLowerCase().includes("auto") ? "auto_subrogation" : "property_damage",
    intakeStatus: "complete",
    currentIntakeStep: 3,
    lastAutosavedAt: null,
    assignedAdjusterName: matter.assignedAdjuster,
    assignedAttorneyName: matter.assignedAttorney,
    assignedStaffName: matter.assignedPerson === matter.assignedAttorney ? null : matter.assignedPerson,
    assignedFirmUser: matter.assignedPerson,
    amountSought: matter.amountSought,
    amountRecovered: matter.amountRecovered,
    stage: mapStage(matter.stage),
    priority: matter.priority === "Urgent" ? "urgent" : matter.priority === "High priority" ? "high" : matter.priority === "Low priority" ? "low" : "normal",
    nextAction: matter.nextAction ?? null,
    nextActionDueDate: matter.nextActionDueDate ?? null,
    statuteDeadline: matter.statuteDeadline,
    statuteDeadlineVerified: matter.deadlineVerified,
    daysSinceLastSubstantiveActivity: matter.daysSinceLastSubstantiveActivity,
    lastSubstantiveActivityAt: matter.lastSubstantiveActivity,
    lastUpdated: matter.lastUpdated,
    jurisdiction: index % 2 === 0 ? "Illinois" : "Indiana",
    insuranceStatus: index % 3 === 0 ? "unknown" : "confirmed_coverage",
    liabilityAssessment: index % 4 === 0 ? "unknown" : "moderate",
    collectabilityAssessment: "moderate",
    isArchived: false,
    warnings,
    followUpReasons: matter.followUpReasons,
    primaryPartyNames: index % 3 === 0 ? [] : ["Taylor Reed"],
  };
});

developmentMatterItems.push({
  id: "development-intake-draft",
  matterName: "Draft Intake: Rivergate Slip Loss",
  carrierName: "Summit Casualty",
  carrierClaimNumber: "SC-88420-26",
  firmMatterNumber: null,
  matterType: "property_damage",
  intakeStatus: "in_progress",
  currentIntakeStep: 2,
  lastAutosavedAt: "2026-07-03T13:45:00.000Z",
  assignedAdjusterName: "Owen Mercer",
  assignedAttorneyName: "Amara Ross",
  assignedStaffName: "Nora Chen",
  assignedFirmUser: "Nora Chen",
  amountSought: 51200,
  amountRecovered: 0,
  stage: "new_referral",
  priority: "normal",
  nextAction: "Complete intake review",
  nextActionDueDate: null,
  statuteDeadline: null,
  statuteDeadlineVerified: false,
  daysSinceLastSubstantiveActivity: null,
  lastSubstantiveActivityAt: null,
  lastUpdated: "2026-07-03",
  jurisdiction: "Illinois",
  insuranceStatus: "unknown",
  liabilityAssessment: "unknown",
  collectabilityAssessment: "unknown",
  isArchived: false,
  warnings: ["draft_intake", "missing_information"],
  followUpReasons: ["missing_next_action"],
  primaryPartyNames: [],
});

export function getDevelopmentMatterDetail(id: string, profile: Profile): MatterDetail | null {
  const item = developmentMatterItems.find((matter) => matter.id === id);
  if (!item) return null;

  const demandReadyEvidence = item.id === "northstar-collins-claim";
  const evidence: EvidenceItem[] = [
    {
      id: `${id}-evidence-ledger`,
      evidenceType: "payment_ledger",
      status: item.warnings.includes("missing_required_evidence") && !demandReadyEvidence ? "missing" : "received",
      dateRequested: "2026-06-20",
      dateReceived: item.warnings.includes("missing_required_evidence") && !demandReadyEvidence ? null : "2026-06-25",
      notes: "Carrier payment ledger from fictional claim file.",
      updatedAt: item.lastUpdated,
    },
    {
      id: `${id}-evidence-report`,
      evidenceType: "police_or_incident_report",
      status: demandReadyEvidence ? "received" : "requested",
      dateRequested: "2026-06-20",
      dateReceived: demandReadyEvidence ? "2026-06-24" : null,
      notes: "Fictional incident report status.",
      updatedAt: item.lastUpdated,
    },
    {
      id: `${id}-evidence-estimate`,
      evidenceType: "repair_estimate",
      status: demandReadyEvidence ? "received" : "requested",
      dateRequested: "2026-06-20",
      dateReceived: demandReadyEvidence ? "2026-06-25" : null,
      notes: "Fictional repair estimate status.",
      updatedAt: item.lastUpdated,
    },
    {
      id: `${id}-evidence-photos`,
      evidenceType: "photographs",
      status: demandReadyEvidence ? "received" : "requested",
      dateRequested: "2026-06-28",
      dateReceived: demandReadyEvidence ? "2026-06-29" : null,
      notes: "Waiting on scene photos from carrier contact.",
      updatedAt: item.lastUpdated,
    },
    {
      id: `${id}-evidence-insurance`,
      evidenceType: "insurance_information",
      status: demandReadyEvidence ? "received" : "requested",
      dateRequested: "2026-06-28",
      dateReceived: demandReadyEvidence ? "2026-06-29" : null,
      notes: "Fictional adverse insurance information.",
      updatedAt: item.lastUpdated,
    },
  ];
  const deadlines: DeadlineItem[] = item.statuteDeadline
    ? [
        {
          id: `${id}-deadline-statute`,
          title: "Statute of limitations",
          deadlineType: "statute_of_limitations",
          deadlineDate: item.statuteDeadline,
          isVerified: item.statuteDeadlineVerified,
          verifiedByName: item.statuteDeadlineVerified ? item.assignedAttorneyName : null,
          verifiedAt: item.statuteDeadlineVerified ? "2026-07-01T14:00:00.000Z" : null,
          assignedToName: item.assignedFirmUser,
          reminderDate: item.nextActionDueDate,
          notes: item.statuteDeadlineVerified ? null : "Deadline requires attorney verification.",
        },
      ]
    : [];
  const tasks: TaskItem[] = [
    {
      id: `${id}-task-next`,
      title: item.nextAction ?? "Assign next action",
      description: "Primary operational next action for the matter.",
      assignedToName: item.assignedFirmUser,
      dueDate: item.nextActionDueDate,
      priority: item.priority,
      status: item.nextActionDueDate && item.nextActionDueDate < "2026-07-03" ? "blocked" : "not_started",
      completedAt: null,
      createdByName: "Eli Linden",
    },
  ];
  const timeline: TimelineItem[] = [
    ...activityItems
      .filter((activity) => activity.matterId === id)
      .map((activity) => ({
        id: activity.id,
        kind: "activity" as const,
        occurredAt: `${activity.date}T15:00:00.000Z`,
        label: activity.title,
        description: activity.description,
        actorName: "Eli Linden",
        actorId: "development-profile",
        source: "system_activity" as const,
        isStruckThrough: false,
      })),
    {
      id: `${id}-event-referral`,
      kind: "event" as const,
      occurredAt: `${item.lastUpdated}T12:00:00.000Z`,
      label: "Referral received",
      description: "Referral accepted into Recovery Hub.",
      actorName: item.assignedAttorneyName,
      actorId: "development-profile",
      source: "manual" as const,
      isStruckThrough: false,
    },
    ...(id === "fairlane-contractor-overpayment" ? [{
      id: `${id}-event-authority-requested`,
      kind: "event" as const,
      occurredAt: "2026-06-18T12:00:00.000Z",
      label: "Authority requested",
      description: "Settlement authority requested from the carrier contact.",
      actorName: item.assignedAttorneyName,
      actorId: "development-profile",
      source: "manual" as const,
      isStruckThrough: false,
    }] : []),
    ...(id === "lakeview-delivery-collision" ? [{
      id: `${id}-event-demand-sent`,
      kind: "event" as const,
      occurredAt: "2026-06-12T12:00:00.000Z",
      label: "Demand sent",
      description: "Demand marked sent for fictional development data.",
      actorName: item.assignedAttorneyName,
      actorId: "development-profile",
      source: "manual" as const,
      isStruckThrough: false,
    }] : []),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const canViewInternalNotes = profile.role !== "billing" && profile.role !== "read_only";

  return {
    ...item,
    carrierId: item.carrierName,
    assignedAdjusterId: item.assignedAdjusterName,
    carrierSupervisorName: "Lena Ortiz",
    carrierSupervisorEmail: "lena.ortiz@example.test",
    carrierSupervisorPhone: "555-0104",
    adjusterEmail: item.assignedAdjusterName ? `${item.assignedAdjusterName.toLowerCase().replaceAll(" ", ".")}@example.test` : null,
    adjusterPhone: "555-0134",
    adjusterDepartment: "Recovery",
    assignedAttorneyId: item.assignedAttorneyName,
    assignedStaffId: item.assignedStaffName,
    dateReferred: item.lastUpdated,
    dateOfLoss: "2026-06-02",
    venue: "Cook County",
    adverseInsurer: "Fictional Adverse Casualty",
    adverseClaimNumber: "FAC-1182",
    adverseAdjuster: "Marin Ellis",
    liabilitySummary: "Initial review indicates recoverable damages, with remaining liability details still being confirmed.",
    currentStatusSummary: "Demand support is being organized while the next action and deadline status remain under review.",
    statusSummaryUpdatedAt: item.lastUpdated,
    statusSummaryUpdatedByName: "Eli Linden",
    internalNotes: canViewInternalNotes ? "Internal strategy note for fictional development data." : null,
    canViewInternalNotes,
    amountPaid: Math.max(0, item.amountSought - 500),
    deductible: 500,
    anticipatedAdditionalPayments: 0,
    recoverableExpenses: 0,
    estimatedLegalCost: 1200,
    matterSpecificData: {},
    assignments: [
      { id: `${id}-assignment-attorney`, profileId: item.assignedAttorneyName ?? "attorney", profileName: item.assignedAttorneyName ?? "Unassigned", role: "Lead attorney" },
      ...(item.assignedStaffName ? [{ id: `${id}-assignment-staff`, profileId: item.assignedStaffName, profileName: item.assignedStaffName, role: "Assigned staff" }] : []),
    ],
    parties: item.primaryPartyNames.map((name) => ({
      id: `${id}-party-${name}`,
      role: "Responsible party",
      isPrimary: true,
      name,
      email: null,
      phone: null,
      notes: "Fictional party association.",
    })),
    evidence,
    deadlines,
    tasks,
    timeline,
    permissions: { ...developmentPermissions, canManageSharedViews: profile.role === "admin" || profile.role === "partner" },
    closedAt: item.stage === "closed" ? item.lastUpdated : null,
    closedReason: item.stage === "closed" ? "Full recovery" : null,
    archivedAt: item.isArchived ? item.lastUpdated : null,
  };
}

function mapStage(stage: string) {
  if (stage === "New referral") return "new_referral";
  if (stage === "Ready for demand") return "ready_for_demand";
  if (stage === "Demand pending") return "demand_pending";
  if (stage === "Negotiation") return "negotiation";
  if (stage === "Under review") return "initial_review";
  if (stage === "Closed") return "closed";
  return "investigation";
}

export function daysSince(value: string | null) {
  return daysBetweenDates(value, new Date("2026-07-03T12:00:00.000Z"));
}
