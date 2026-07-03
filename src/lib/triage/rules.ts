import {
  evidenceStatusCountsAsComplete,
  type TriageEvaluation,
  type TriageFlag,
  type TriageMatterSnapshot,
  type TriageRule,
  type TriageSettings,
  type TriageSeverity,
} from "@/lib/triage/types";

const excludedReadyStages = new Set([
  "demand_pending",
  "negotiation",
  "arbitration_review",
  "litigation_review",
  "recovery_received",
  "closed",
]);

const recoveryMatterTypes = new Set([
  "auto_subrogation",
  "property_damage",
  "workers_compensation_recovery",
  "health_plan_recovery",
  "commercial_loss",
  "product_related_loss",
  "construction_loss",
  "other",
]);

export const triageRules: TriageRule[] = [
  {
    key: "overdue-next-action",
    flagType: "overdue_next_action",
    category: "follow_up",
    title: "Overdue next action",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot, settings, now) {
      if (!isActiveCompletedMatter(snapshot) || !snapshot.nextAction || !snapshot.nextActionDueDate) return null;
      const due = daysUntil(snapshot.nextActionDueDate, now);
      if (due >= 0) return null;
      const daysOverdue = Math.abs(due);
      const statuteDue = daysUntil(snapshot.statuteDeadline, now);
      const severity: TriageSeverity = daysOverdue > 14 || statuteDue <= settings.urgentStatuteDays ? "critical" : "high";
      return {
        severity,
        explanation: `The next action "${snapshot.nextAction}" was due ${daysOverdue} ${plural("day", daysOverdue)} ago.`,
        suggestedAction: "Update, complete, or reschedule the next action.",
        relevantDate: snapshot.nextActionDueDate,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { daysOverdue, nextAction: snapshot.nextAction },
      };
    },
  },
  {
    key: "missing-next-action",
    flagType: "missing_next_action",
    category: "follow_up",
    title: "Missing next action",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot, settings) {
      if (!settings.missingNextActionIsFlagged || !isActiveCompletedMatter(snapshot)) return null;
      const hasResponsibleUser = snapshot.assignedFirmUser !== "Unassigned";
      if (snapshot.nextAction && snapshot.nextActionDueDate && hasResponsibleUser) return null;
      return {
        severity: "high",
        explanation: "This matter does not have a complete next action, responsible person, and due date.",
        suggestedAction: "Assign a responsible user and record the next action with a due date.",
        relevantDate: snapshot.nextActionDueDate,
        relevantUser: hasResponsibleUser ? snapshot.assignedFirmUser : null,
        metadata: {
          missingAction: !snapshot.nextAction,
          missingDueDate: !snapshot.nextActionDueDate,
          missingResponsibleUser: !hasResponsibleUser,
        },
      };
    },
  },
  {
    key: "urgent-statute-deadline",
    flagType: "urgent_statute_deadline",
    category: "deadline",
    title: "Urgent statute deadline",
    isLegalWarning: true,
    canSnooze: false,
    canOverride: true,
    evaluate(snapshot, settings, now) {
      if (!isActiveMatter(snapshot) || !snapshot.statuteDeadline) return null;
      const due = daysUntil(snapshot.statuteDeadline, now);
      if (due < 0 || due > settings.urgentStatuteDays) return null;
      return {
        severity: "critical",
        explanation: `The recorded statute deadline is in ${due} ${plural("day", due)}. Verification status: ${snapshot.statuteDeadlineVerified ? "verified" : "not verified"}.`,
        suggestedAction: "Review the deadline and confirm the next required legal action.",
        relevantDate: snapshot.statuteDeadline,
        relevantUser: snapshot.assignedAttorneyName ?? snapshot.assignedFirmUser,
        metadata: { daysRemaining: due, statuteDeadlineVerified: snapshot.statuteDeadlineVerified },
      };
    },
  },
  {
    key: "upcoming-statute-deadline",
    flagType: "upcoming_statute_deadline",
    category: "deadline",
    title: "Upcoming statute deadline",
    isLegalWarning: true,
    canSnooze: false,
    canOverride: true,
    evaluate(snapshot, settings, now) {
      if (!isActiveMatter(snapshot) || !snapshot.statuteDeadline) return null;
      const due = daysUntil(snapshot.statuteDeadline, now);
      if (due <= settings.urgentStatuteDays || due > settings.upcomingStatuteDays) return null;
      return {
        severity: due <= 60 ? "high" : "medium",
        explanation: `The recorded statute deadline is in ${due} ${plural("day", due)}.`,
        suggestedAction: "Confirm the matter plan before the deadline moves into the urgent window.",
        relevantDate: snapshot.statuteDeadline,
        relevantUser: snapshot.assignedAttorneyName ?? snapshot.assignedFirmUser,
        metadata: { daysRemaining: due },
      };
    },
  },
  {
    key: "unverified-statute-deadline",
    flagType: "unverified_statute_deadline",
    category: "deadline",
    title: "Unverified statute deadline",
    isLegalWarning: true,
    canSnooze: false,
    canOverride: true,
    evaluate(snapshot, settings, now) {
      if (!settings.unverifiedDeadlineIsFlagged || !isActiveMatter(snapshot) || !snapshot.statuteDeadline || snapshot.statuteDeadlineVerified) return null;
      const due = daysUntil(snapshot.statuteDeadline, now);
      return {
        severity: due <= settings.upcomingStatuteDays ? "high" : "medium",
        explanation: "A statute deadline has been entered but has not been verified by an authorized attorney. Recovery Hub does not confirm legal correctness.",
        suggestedAction: "Have an authorized attorney verify or correct the recorded deadline.",
        relevantDate: snapshot.statuteDeadline,
        relevantUser: snapshot.assignedAttorneyName ?? snapshot.assignedFirmUser,
        metadata: { daysRemaining: due },
      };
    },
  },
  {
    key: "missing-statute-deadline",
    flagType: "missing_statute_deadline",
    category: "deadline",
    title: "Missing statute deadline",
    isLegalWarning: true,
    canSnooze: false,
    canOverride: true,
    evaluate(snapshot) {
      if (!isActiveCompletedMatter(snapshot) || snapshot.statuteDeadline) return null;
      return {
        severity: recoveryMatterTypes.has(snapshot.matterType) ? "high" : "medium",
        explanation: "No statute deadline has been recorded. Review whether a limitations date applies.",
        suggestedAction: "Record the applicable deadline or document why it is not required.",
        relevantDate: null,
        relevantUser: snapshot.assignedAttorneyName ?? snapshot.assignedFirmUser,
        metadata: { matterType: snapshot.matterType },
      };
    },
  },
  {
    key: "stale-matter",
    flagType: "stale_matter",
    category: "follow_up",
    title: "Stale matter",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot, settings, now) {
      if (!isActiveCompletedMatter(snapshot)) return null;
      const days = snapshot.daysSinceLastSubstantiveActivity;
      if (days === null || days < settings.staleMatterDays || isOnFutureHold(snapshot, now)) return null;
      return {
        severity: days >= settings.staleMatterDays * 2 ? "high" : "medium",
        explanation: `No substantive activity has been recorded for ${days} ${plural("day", days)}. Autosaves and page views are not counted as substantive activity.`,
        suggestedAction: "Record the next substantive step or document the reason for a future hold.",
        relevantDate: snapshot.lastSubstantiveActivityAt,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { daysSinceLastSubstantiveActivity: days },
      };
    },
  },
  {
    key: "new-referral-unreviewed",
    flagType: "new_referral_unreviewed",
    category: "referral",
    title: "New referral unreviewed",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot, settings, now) {
      if (!isActiveCompletedMatter(snapshot) || snapshot.stage !== "new_referral") return null;
      const received = snapshot.dateReferred ?? snapshot.createdAt ?? snapshot.lastUpdated;
      const age = daysSince(received, now);
      if (age < settings.newReferralReviewDays) return null;
      return {
        severity: age >= settings.newReferralReviewDays * 2 ? "high" : "medium",
        explanation: `This referral was received ${age} ${plural("day", age)} ago and has not completed initial review.`,
        suggestedAction: "Complete initial review and route the matter to the right stage.",
        relevantDate: received,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { referralAgeDays: age },
      };
    },
  },
  {
    key: "draft-intake",
    flagType: "draft_intake",
    category: "referral",
    title: "Draft intake",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: false,
    evaluate(snapshot, settings, now) {
      if (snapshot.intakeStatus === "complete" || snapshot.isArchived || snapshot.stage === "closed") return null;
      const started = snapshot.lastAutosavedAt ?? snapshot.createdAt ?? snapshot.lastUpdated;
      const age = daysSince(started, now);
      return {
        severity: age > settings.newReferralReviewDays || snapshot.assignedFirmUser === "Unassigned" ? "medium" : "informational",
        explanation: `Intake was started ${age} ${plural("day", age)} ago and remains incomplete.`,
        suggestedAction: "Resume and complete intake.",
        relevantDate: started,
        relevantUser: snapshot.assignedFirmUser === "Unassigned" ? null : snapshot.assignedFirmUser,
        metadata: { draftAgeDays: age },
      };
    },
  },
  {
    key: "missing-assignment",
    flagType: "missing_assignment",
    category: "missing_information",
    title: "Missing assignment",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot) {
      if (!isActiveCompletedMatter(snapshot) || snapshot.assignedAttorneyName || snapshot.assignedStaffName) return null;
      return {
        severity: "high",
        explanation: "No firm user is currently responsible for this matter.",
        suggestedAction: "Assign an attorney, staff member, or explicit matter owner.",
        relevantDate: null,
        relevantUser: null,
        metadata: {},
      };
    },
  },
  {
    key: "missing-responsible-party",
    flagType: "responsible_party_missing",
    category: "missing_information",
    title: "Missing responsible party",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot) {
      if (!isActiveCompletedMatter(snapshot) || snapshot.primaryPartyNames.length > 0 || !recoveryMatterTypes.has(snapshot.matterType)) return null;
      return {
        severity: "medium",
        explanation: "A responsible party has not been identified.",
        suggestedAction: "Add the responsible party or document why that information is not applicable.",
        relevantDate: null,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { matterType: snapshot.matterType },
      };
    },
  },
  {
    key: "unknown-insurance-status",
    flagType: "insurance_status_unknown",
    category: "missing_information",
    title: "Unknown insurance status",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot) {
      if (!isActiveCompletedMatter(snapshot) || snapshot.insuranceStatus !== "unknown" || ["new_referral", "initial_review"].includes(snapshot.stage)) return null;
      return {
        severity: "medium",
        explanation: "The adverse party's insurance status remains unknown.",
        suggestedAction: "Locate or confirm adverse insurance.",
        relevantDate: null,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { insuranceStatus: snapshot.insuranceStatus },
      };
    },
  },
  {
    key: "unknown-liability-assessment",
    flagType: "liability_assessment_unknown",
    category: "missing_information",
    title: "Unknown liability assessment",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot) {
      if (!isActiveCompletedMatter(snapshot) || snapshot.liabilityAssessment !== "unknown" || ["new_referral", "initial_review"].includes(snapshot.stage)) return null;
      return {
        severity: "medium",
        explanation: "Liability has not yet been assessed. This flag does not state a legal conclusion.",
        suggestedAction: "Record the current liability assessment or document why it remains unknown.",
        relevantDate: null,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { liabilityAssessment: snapshot.liabilityAssessment },
      };
    },
  },
  {
    key: "financial-information-missing",
    flagType: "financial_information_missing",
    category: "missing_information",
    title: "Financial information missing",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot) {
      if (!isActiveCompletedMatter(snapshot) || snapshot.amountSought > 0) return null;
      return {
        severity: "medium",
        explanation: "The amount currently sought has not been recorded.",
        suggestedAction: "Record the recovery amount or document why the amount is intentionally unknown.",
        relevantDate: null,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { amountSought: snapshot.amountSought },
      };
    },
  },
  {
    key: "payment-documentation-missing",
    flagType: "payment_documentation_missing",
    category: "missing_information",
    title: "Payment documentation missing",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot, settings) {
      if (!isActiveCompletedMatter(snapshot) || snapshot.amountSought <= 0) return null;
      if (!settings.readyForDemandAllowedLiabilityValues.includes(snapshot.liabilityAssessment)) return null;
      if (hasEvidence(snapshot, "payment_ledger")) return null;
      return {
        severity: "medium",
        explanation: "Proof of the carrier's payment has not been marked received.",
        suggestedAction: "Mark the payment ledger or equivalent proof of payment received, unavailable, or not applicable.",
        relevantDate: null,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { requiredEvidence: "payment_ledger" },
      };
    },
  },
  {
    key: "overdue-task",
    flagType: "overdue_task",
    category: "task",
    title: "Overdue task",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: false,
    evaluate(snapshot, _settings, now) {
      if (!isActiveMatter(snapshot)) return null;
      const overdue = snapshot.tasks.filter((task) => task.status !== "completed" && task.status !== "canceled" && task.dueDate && daysUntil(task.dueDate, now) < 0);
      if (overdue.length === 0) return null;
      const oldest = overdue.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];
      const highest = highestPriority(overdue.map((task) => task.priority));
      return {
        severity: highest === "urgent" ? "critical" : "high",
        explanation: `${overdue.length} open ${plural("task", overdue.length)} ${overdue.length === 1 ? "is" : "are"} past due. Oldest due date: ${oldest.dueDate}.`,
        suggestedAction: "Update the overdue task status or reschedule the task.",
        relevantDate: oldest.dueDate,
        relevantUser: oldest.assignedToName ?? snapshot.assignedFirmUser,
        metadata: { overdueTaskCount: overdue.length, highestTaskPriority: highest },
      };
    },
  },
  {
    key: "overdue-deadline",
    flagType: "overdue_deadline",
    category: "deadline",
    title: "Overdue deadline",
    isLegalWarning: true,
    canSnooze: false,
    canOverride: true,
    evaluate(snapshot, _settings, now) {
      if (!isActiveMatter(snapshot)) return null;
      const overdue = snapshot.deadlines.filter((deadline) => daysUntil(deadline.deadlineDate, now) < 0);
      if (overdue.length === 0) return null;
      const legal = overdue.find((deadline) => deadline.deadlineType === "statute_of_limitations" || deadline.deadlineType === "filing");
      const primary = legal ?? overdue[0];
      return {
        severity: legal ? "critical" : "high",
        explanation: `The recorded deadline "${primary.title}" has passed and remains active in the matter record.`,
        suggestedAction: "Review the deadline immediately and update its status or record the completed action.",
        relevantDate: primary.deadlineDate,
        relevantUser: primary.assignedToName ?? snapshot.assignedAttorneyName ?? snapshot.assignedFirmUser,
        metadata: { overdueDeadlineCount: overdue.length, deadlineType: primary.deadlineType },
      };
    },
  },
  {
    key: "awaiting-response",
    flagType: "awaiting_response",
    category: "follow_up",
    title: "Awaiting outside response",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot, settings, now) {
      if (!isActiveCompletedMatter(snapshot)) return null;
      const sent = latestTimelineEvent(snapshot, ["demand sent", "document requested", "authority requested"]);
      if (!sent) return null;
      const response = latestTimelineEvent(snapshot, ["response received", "offer received", "authority received"]);
      if (response && response.occurredAt > sent.occurredAt) return null;
      const followUpDate = addDays(sent.occurredAt, settings.overdueResponseDays);
      const due = daysUntil(followUpDate, now);
      if (due > 0) return null;
      const daysWaiting = daysSince(sent.occurredAt, now);
      return {
        severity: due <= -settings.overdueResponseDays ? "high" : "medium",
        explanation: `The ${sent.label.toLowerCase()} was recorded ${daysWaiting} ${plural("day", daysWaiting)} ago, and no response has been recorded.`,
        suggestedAction: "Follow up with the outside party or record the response.",
        relevantDate: followUpDate,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { waitingSince: sent.occurredAt, daysWaiting },
      };
    },
  },
  {
    key: "awaiting-client",
    flagType: "awaiting_client",
    category: "follow_up",
    title: "Awaiting carrier instruction",
    isLegalWarning: false,
    canSnooze: true,
    canOverride: true,
    evaluate(snapshot, _settings, now) {
      if (!isActiveCompletedMatter(snapshot) || !snapshot.nextActionDueDate || !snapshot.nextAction) return null;
      const text = snapshot.nextAction.toLowerCase();
      if (!text.includes("client") && !text.includes("carrier") && !text.includes("authority")) return null;
      const due = daysUntil(snapshot.nextActionDueDate, now);
      if (due > 0) return null;
      return {
        severity: due < -7 ? "high" : "medium",
        explanation: `${snapshot.nextAction} is due for follow-up.`,
        suggestedAction: "Request or record the carrier instruction needed to move the matter forward.",
        relevantDate: snapshot.nextActionDueDate,
        relevantUser: snapshot.assignedFirmUser,
        metadata: { daysPastFollowUp: Math.abs(due) },
      };
    },
  },
  {
    key: "ready-for-demand",
    flagType: "ready_for_demand",
    category: "readiness",
    title: "Ready for demand review",
    isLegalWarning: false,
    canSnooze: false,
    canOverride: false,
    evaluate(snapshot, settings) {
      if (!isActiveCompletedMatter(snapshot) || excludedReadyStages.has(snapshot.stage)) return null;
      if (snapshot.primaryPartyNames.length === 0 || snapshot.amountSought <= 0 || !snapshot.statuteDeadline) return null;
      if (!settings.readyForDemandAllowedLiabilityValues.includes(snapshot.liabilityAssessment)) return null;
      if (!settings.readyForDemandAllowedInsuranceValues.includes(snapshot.insuranceStatus)) return null;
      const missingEvidence = settings.readyForDemandRequiredEvidence.filter((type) => !hasEvidence(snapshot, type));
      if (missingEvidence.length > 0) return null;
      return {
        severity: "low",
        explanation: "The matter has the core information and supporting evidence typically needed to begin demand preparation.",
        suggestedAction: "Confirm readiness before preparing or sending a demand.",
        relevantDate: snapshot.statuteDeadline,
        relevantUser: snapshot.assignedAttorneyName ?? snapshot.assignedFirmUser,
        metadata: { requiresHumanConfirmation: true },
      };
    },
  },
];

export function evaluateMatterTriage(snapshot: TriageMatterSnapshot, settings: TriageSettings, now = new Date()): TriageEvaluation {
  const evaluatedAt = now.toISOString();
  const flags = triageRules
    .map((rule): TriageFlag | null => {
      const result = rule.evaluate(snapshot, settings, now);
      if (!result) return null;
      return {
        ...result,
        matterId: snapshot.id,
        ruleKey: rule.key,
        flagType: rule.flagType,
        category: rule.category,
        title: rule.title,
        detectedAt: evaluatedAt,
        lastEvaluatedAt: evaluatedAt,
        resolvedAt: null,
        dismissedUntil: null,
        resolutionReason: null,
        canSnooze: rule.canSnooze,
        canOverride: rule.canOverride,
        isLegalWarning: rule.isLegalWarning,
      } satisfies TriageFlag;
    })
    .filter((flag): flag is TriageFlag => Boolean(flag));

  return { matterId: snapshot.id, evaluatedAt, flags };
}

export function getPrimaryTriageFlag(flags: TriageFlag[]) {
  return [...flags].sort(compareTriageFlags)[0] ?? null;
}

export function compareTriageFlags(a: TriageFlag, b: TriageFlag) {
  return severityWeight(a.severity) - severityWeight(b.severity)
    || categoryWeight(a.flagType) - categoryWeight(b.flagType)
    || compareRelevantDates(a.relevantDate, b.relevantDate);
}

export function compareMatterTriage(a: { flags: TriageFlag[]; amountSought: number; daysSinceLastSubstantiveActivity: number | null }, b: { flags: TriageFlag[]; amountSought: number; daysSinceLastSubstantiveActivity: number | null }) {
  const primaryA = getPrimaryTriageFlag(a.flags);
  const primaryB = getPrimaryTriageFlag(b.flags);
  if (!primaryA && !primaryB) return b.amountSought - a.amountSought;
  if (!primaryA) return 1;
  if (!primaryB) return -1;
  return compareTriageFlags(primaryA, primaryB)
    || b.amountSought - a.amountSought
    || (b.daysSinceLastSubstantiveActivity ?? -1) - (a.daysSinceLastSubstantiveActivity ?? -1);
}

export function isSnoozed(flag: TriageFlag, now = new Date()) {
  return Boolean(flag.dismissedUntil && new Date(flag.dismissedUntil).getTime() > now.getTime());
}

function isActiveMatter(snapshot: TriageMatterSnapshot) {
  return !snapshot.isArchived && snapshot.stage !== "closed";
}

function isActiveCompletedMatter(snapshot: TriageMatterSnapshot) {
  return isActiveMatter(snapshot) && snapshot.intakeStatus === "complete";
}

function isOnFutureHold(snapshot: TriageMatterSnapshot, now: Date) {
  if (!snapshot.nextAction || !snapshot.nextActionDueDate) return false;
  const text = snapshot.nextAction.toLowerCase();
  return (text.includes("hold") || text.includes("waiting") || text.includes("await")) && daysUntil(snapshot.nextActionDueDate, now) > 0;
}

function hasEvidence(snapshot: TriageMatterSnapshot, evidenceType: string) {
  return snapshot.evidence.some((item) => item.evidenceType === evidenceType && evidenceStatusCountsAsComplete.includes(item.status));
}

function latestTimelineEvent(snapshot: TriageMatterSnapshot, labels: string[]) {
  const normalized = labels.map((label) => label.toLowerCase());
  return snapshot.timeline
    .filter((item) => item.kind === "event" && normalized.includes(item.label.toLowerCase()))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0] ?? null;
}

function highestPriority(priorities: Array<"urgent" | "high" | "normal" | "low">) {
  return [...priorities].sort((a, b) => priorityWeight(a) - priorityWeight(b))[0] ?? "normal";
}

function priorityWeight(priority: "urgent" | "high" | "normal" | "low") {
  const weights = { urgent: 0, high: 1, normal: 2, low: 3 };
  return weights[priority];
}

function severityWeight(severity: TriageSeverity) {
  const weights: Record<TriageSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    informational: 4,
  };
  return weights[severity];
}

function categoryWeight(flagType: TriageFlag["flagType"]) {
  const weights: Partial<Record<TriageFlag["flagType"], number>> = {
    overdue_deadline: 0,
    urgent_statute_deadline: 1,
    overdue_next_action: 2,
    missing_statute_deadline: 3,
    unverified_statute_deadline: 4,
    overdue_task: 5,
    missing_assignment: 6,
    stale_matter: 7,
    new_referral_unreviewed: 8,
    awaiting_response: 9,
    awaiting_client: 10,
    missing_information: 11,
    ready_for_demand: 12,
  };
  return weights[flagType] ?? 20;
}

function compareRelevantDates(a: string | null, b: string | null) {
  return (a ?? "9999-12-31").localeCompare(b ?? "9999-12-31");
}

function daysUntil(date: string | null, from: Date) {
  if (!date) return Number.POSITIVE_INFINITY;
  const target = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const basis = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  return Math.ceil((target.getTime() - basis.getTime()) / 86_400_000);
}

function daysSince(date: string | null, from: Date) {
  if (!date) return 0;
  return Math.max(0, -daysUntil(date, from));
}

function addDays(date: string, days: number) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function plural(word: string, count: number) {
  return count === 1 ? word : `${word}s`;
}
