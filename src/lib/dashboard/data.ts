import type { SummaryMetric } from "@/lib/types";
import type { Profile } from "@/lib/data/profiles";
import { loadMatterDetail, loadMattersWorkspace } from "@/lib/matters-workspace/data";
import type { DeadlineItem, MatterDetail, TaskItem, TimelineItem } from "@/lib/matters-workspace/types";
import { developmentMatterItems, getDevelopmentMatterDetail } from "@/lib/matters-workspace/mock";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { compareMatterTriage, evaluateMatterTriage, getPrimaryTriageFlag, isSnoozed } from "@/lib/triage/rules";
import { loadActiveMatterFlags, loadTriageSettings } from "@/lib/triage/data";
import { createSnapshotFromDetail, type TriageFlag, type TriageMatterSnapshot } from "@/lib/triage/types";
import { loadAssessmentSummariesForMatterIds, type AssessmentSummary } from "@/lib/recovery-assessment/data";

export type DashboardMode = "my" | "firm";

export type DashboardMatter = {
  snapshot: TriageMatterSnapshot;
  flags: TriageFlag[];
  primaryFlag: TriageFlag | null;
};

export type DashboardTask = TaskItem & {
  matterId: string;
  matterName: string;
  carrierName: string;
};

export type DashboardDeadline = DeadlineItem & {
  matterId: string;
  matterName: string;
  responsibleUser: string;
  daysRemaining: number;
};

export type DashboardActivity = TimelineItem & {
  matterId: string;
  matterName: string;
};

export type WorkloadItem = {
  userName: string;
  activeMatters: number;
  overdueNextActions: number;
  upcomingDeadlines: number;
  openTasks: number;
  readyForDemand: number;
  staleMatters: number;
};

export type DashboardData = {
  mode: DashboardMode;
  canUseFirmMode: boolean;
  greetingName: string;
  today: string;
  summaryMetrics: SummaryMetric[];
  priorityQueue: DashboardMatter[];
  needsFollowUp: DashboardMatter[];
  missingInformation: DashboardMatter[];
  upcomingDeadlines: DashboardDeadline[];
  readyForDemand: DashboardMatter[];
  newReferrals: DashboardMatter[];
  myTasks: DashboardTask[];
  recentActivity: DashboardActivity[];
  workload: WorkloadItem[];
  highValueOpportunities: AssessmentSummary[];
  assessmentNeeded: DashboardMatter[];
  settingsUpdatedAt: string | null;
  lastFlagRefreshAt: string | null;
  totalMatterCount: number;
};

const developmentNow = new Date("2026-07-03T12:00:00.000Z");

export async function loadDashboardMatterSnapshots(input: {
  profile: Profile;
  mode: DashboardMode;
}): Promise<TriageMatterSnapshot[]> {
  if (!isSupabaseConfigured()) {
    const details = developmentMatterItems
      .map((item) => getDevelopmentMatterDetail(item.id, input.profile))
      .filter((item): item is MatterDetail => Boolean(item));
    return filterSnapshotsByMode(details.map(createSnapshotFromDetail), input.profile, input.mode);
  }

  const { result } = await loadMattersWorkspace({
    profile: input.profile,
    searchParams: { pageSize: "100", sort: "needs_attention", archived: "false" },
  });
  const details = await Promise.all(
    result.items.map(async (item) => {
      try {
        return await loadMatterDetail(item.id, input.profile);
      } catch {
        return null;
      }
    })
  );
  return filterSnapshotsByMode(details.filter((item): item is MatterDetail => Boolean(item)).map(createSnapshotFromDetail), input.profile, input.mode);
}

export async function loadDashboardData(input: {
  profile: Profile;
  mode?: string;
}): Promise<DashboardData> {
  const canUseFirmMode = input.profile.role === "admin" || input.profile.role === "partner";
  const mode: DashboardMode = input.mode === "firm" && canUseFirmMode ? "firm" : "my";
  const [{ settings, updatedAt }, snapshots] = await Promise.all([
    loadTriageSettings(input.profile),
    loadDashboardMatterSnapshots({ profile: input.profile, mode }),
  ]);

  const now = isSupabaseConfigured() ? new Date() : developmentNow;
  const storedFlags = await loadActiveMatterFlags(snapshots.map((snapshot) => snapshot.id));
  const matters = snapshots.map((snapshot) => {
    const computed = evaluateMatterTriage(snapshot, settings, now).flags;
    const merged = mergeStoredFlagState(computed, storedFlags.get(snapshot.id) ?? [], now);
    const visibleFlags = merged.filter((flag) => !isSnoozed(flag, now));
    return {
      snapshot,
      flags: visibleFlags,
      primaryFlag: getPrimaryTriageFlag(visibleFlags),
    };
  });

  const priorityQueue = matters
    .filter((matter) => matter.flags.length > 0)
    .sort((a, b) => compareMatterTriage({
      flags: a.flags,
      amountSought: a.snapshot.amountSought,
      daysSinceLastSubstantiveActivity: a.snapshot.daysSinceLastSubstantiveActivity,
    }, {
      flags: b.flags,
      amountSought: b.snapshot.amountSought,
      daysSinceLastSubstantiveActivity: b.snapshot.daysSinceLastSubstantiveActivity,
    }))
    .slice(0, 8);

  const needsFollowUp = byFlagTypes(matters, ["overdue_next_action", "missing_next_action", "stale_matter", "awaiting_response", "awaiting_client", "overdue_task", "new_referral_unreviewed"]);
  const missingInformation = byFlagCategories(matters, ["missing_information"]);
  const readyForDemand = byFlagTypes(matters, ["ready_for_demand"]).sort((a, b) => b.snapshot.amountSought - a.snapshot.amountSought).slice(0, 5);
  const upcomingDeadlineMatters = byFlagCategories(matters, ["deadline"]);
  const upcomingDeadlines = buildUpcomingDeadlines(upcomingDeadlineMatters, now);
  const myTasks = buildMyTasks(snapshots, input.profile, now);
  const recentActivity = buildRecentActivity(snapshots).slice(0, 6);
  const workload = canUseFirmMode && mode === "firm" ? buildWorkload(matters, snapshots) : [];
  const assessmentSummaries = await loadAssessmentSummariesForMatterIds(snapshots.map((snapshot) => snapshot.id), input.profile);
  const highValueOpportunities = assessmentSummaries
    .filter((summary) => summary.current && summary.current.expectedNetValue > 0 && summary.current.viabilityScore >= 65 && summary.current.dataCompletenessPercentage >= 50)
    .filter((summary) => !matters.find((matter) => matter.snapshot.id === summary.matterId)?.flags.some((flag) => flag.severity === "critical"))
    .sort((a, b) => (b.current?.expectedNetValue ?? 0) - (a.current?.expectedNetValue ?? 0))
    .slice(0, 5);
  const assessedMatterIds = new Set(assessmentSummaries.filter((summary) => summary.current).map((summary) => summary.matterId));
  const assessmentNeeded = matters
    .filter((matter) => !assessedMatterIds.has(matter.snapshot.id))
    .filter((matter) => matter.snapshot.intakeStatus === "complete" && matter.snapshot.stage !== "new_referral" && matter.snapshot.stage !== "closed" && matter.snapshot.amountSought >= 10000)
    .sort((a, b) => b.snapshot.amountSought - a.snapshot.amountSought)
    .slice(0, 5);
  const newReferrals = byFlagCategories(matters, ["referral"]).slice(0, 5);
  const lastFlagRefreshAt = [...storedFlags.values()].flat().map((flag) => flag.lastEvaluatedAt).sort().at(-1) ?? null;

  return {
    mode,
    canUseFirmMode,
    greetingName: input.profile.full_name.split(" ")[0] ?? "there",
    today: now.toISOString(),
    summaryMetrics: buildSummaryMetrics({
      needsFollowUp,
      missingInformation,
      upcomingDeadlineMatters,
      readyForDemand,
      matters,
      myTasks,
    }),
    priorityQueue,
    needsFollowUp: needsFollowUp.slice(0, 5),
    missingInformation: missingInformation.slice(0, 5),
    upcomingDeadlines,
    readyForDemand,
    newReferrals,
    myTasks,
    recentActivity,
    workload,
    highValueOpportunities,
    assessmentNeeded,
    settingsUpdatedAt: updatedAt,
    lastFlagRefreshAt,
    totalMatterCount: matters.length,
  };
}

function mergeStoredFlagState(computed: TriageFlag[], stored: TriageFlag[], now: Date) {
  const storedByRule = new Map(stored.map((flag) => [flag.ruleKey, flag]));
  return computed.map((flag) => {
    const persisted = storedByRule.get(flag.ruleKey);
    if (!persisted) return flag;
    return {
      ...flag,
      id: persisted.id,
      detectedAt: persisted.detectedAt,
      dismissedUntil: persisted.dismissedUntil,
      metadata: { ...flag.metadata, ...persisted.metadata },
      lastEvaluatedAt: persisted.lastEvaluatedAt || now.toISOString(),
    };
  });
}

function filterSnapshotsByMode(snapshots: TriageMatterSnapshot[], profile: Profile, mode: DashboardMode) {
  if (mode === "firm" && (profile.role === "admin" || profile.role === "partner")) return snapshots;
  return snapshots.filter((snapshot) => {
    const assignedNames = [snapshot.assignedAttorneyName, snapshot.assignedStaffName, snapshot.assignedFirmUser].filter(Boolean);
    return assignedNames.includes(profile.full_name);
  });
}

function byFlagTypes(matters: DashboardMatter[], types: TriageFlag["flagType"][]) {
  return matters.filter((matter) => matter.flags.some((flag) => types.includes(flag.flagType)));
}

function byFlagCategories(matters: DashboardMatter[], categories: TriageFlag["category"][]) {
  return matters.filter((matter) => matter.flags.some((flag) => categories.includes(flag.category)));
}

function buildSummaryMetrics(input: {
  needsFollowUp: DashboardMatter[];
  missingInformation: DashboardMatter[];
  upcomingDeadlineMatters: DashboardMatter[];
  readyForDemand: DashboardMatter[];
  matters: DashboardMatter[];
  myTasks: DashboardTask[];
}): SummaryMetric[] {
  const overdueActions = input.matters.filter((matter) => matter.flags.some((flag) => flag.flagType === "overdue_next_action")).length;
  const urgentDeadlines = input.matters.filter((matter) => matter.flags.some((flag) => flag.flagType === "urgent_statute_deadline" || flag.flagType === "overdue_deadline")).length;
  const newReferrals = input.matters.filter((matter) => matter.flags.some((flag) => flag.category === "referral")).length;

  return [
    {
      title: "Needs Follow-Up",
      count: input.needsFollowUp.length,
      description: "Overdue actions, stale files, or outside responses past follow-up.",
      href: "/matters?view=needs-follow-up",
      trend: overdueActions > 0 ? `${overdueActions} overdue next ${overdueActions === 1 ? "action" : "actions"}` : "No overdue next actions",
      tone: input.needsFollowUp.some((matter) => matter.primaryFlag?.severity === "critical") ? "urgent" : "warning",
    },
    {
      title: "Missing Information",
      count: input.missingInformation.length,
      description: "Material information gaps that can slow recovery work.",
      href: "/matters?view=missing-information",
      trend: `${input.missingInformation.filter((matter) => matter.primaryFlag?.severity === "high").length} high-priority gaps`,
      tone: "warning",
    },
    {
      title: "Upcoming Deadlines",
      count: input.upcomingDeadlineMatters.length,
      description: "Recorded deadlines that are overdue, urgent, upcoming, or unverified.",
      href: "/matters?view=upcoming-deadlines",
      trend: urgentDeadlines > 0 ? `${urgentDeadlines} urgent or overdue` : "No urgent legal deadlines",
      tone: urgentDeadlines > 0 ? "urgent" : "neutral",
    },
    {
      title: "Ready for Demand",
      count: input.readyForDemand.length,
      description: "Appears ready for attorney confirmation before demand preparation.",
      href: "/matters?view=ready-for-demand",
      trend: "Requires human confirmation",
      tone: "success",
    },
    {
      title: "New Referrals",
      count: newReferrals,
      description: "Recent or aged referrals that still need review or intake completion.",
      href: "/matters?view=new-referrals",
      trend: input.myTasks.length > 0 ? `${input.myTasks.length} tasks due soon` : "No tasks due soon",
      tone: "neutral",
    },
  ];
}

function buildMyTasks(snapshots: TriageMatterSnapshot[], profile: Profile, now: Date) {
  const inSevenDays = new Date(now);
  inSevenDays.setUTCDate(inSevenDays.getUTCDate() + 7);
  return snapshots
    .flatMap((snapshot) =>
      snapshot.tasks
        .filter((task) => task.status !== "completed" && task.status !== "canceled" && task.dueDate)
        .filter((task) => {
          const due = new Date(`${task.dueDate}T00:00:00Z`);
          const assignedToMe = task.assignedToName === profile.full_name || snapshot.assignedFirmUser === profile.full_name || profile.role === "admin" || profile.role === "partner";
          return assignedToMe && due <= inSevenDays;
        })
        .map((task) => ({ ...task, matterId: snapshot.id, matterName: snapshot.matterName, carrierName: snapshot.carrierName }))
    )
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 6);
}

function buildUpcomingDeadlines(matters: DashboardMatter[], now: Date) {
  return matters
    .flatMap((matter) => {
      const detailDeadlines = matter.snapshot.deadlines.map((deadline) => ({
        ...deadline,
        matterId: matter.snapshot.id,
        matterName: matter.snapshot.matterName,
        responsibleUser: deadline.assignedToName ?? matter.snapshot.assignedFirmUser,
        daysRemaining: daysUntil(deadline.deadlineDate, now),
      }));
      if (detailDeadlines.length > 0 || !matter.snapshot.statuteDeadline) return detailDeadlines;
      return [{
        id: `${matter.snapshot.id}-statute`,
        title: "Statute deadline",
        deadlineType: "statute_of_limitations" as const,
        deadlineDate: matter.snapshot.statuteDeadline,
        isVerified: matter.snapshot.statuteDeadlineVerified,
        verifiedByName: matter.snapshot.statuteDeadlineVerified ? matter.snapshot.assignedAttorneyName : null,
        verifiedAt: null,
        assignedToName: matter.snapshot.assignedAttorneyName,
        reminderDate: matter.snapshot.nextActionDueDate,
        notes: null,
        matterId: matter.snapshot.id,
        matterName: matter.snapshot.matterName,
        responsibleUser: matter.snapshot.assignedAttorneyName ?? matter.snapshot.assignedFirmUser,
        daysRemaining: daysUntil(matter.snapshot.statuteDeadline, now),
      }];
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 6);
}

function buildRecentActivity(snapshots: TriageMatterSnapshot[]) {
  const meaningful = new Set([
    "intake completed",
    "initial review completed",
    "deadline verified",
    "document received",
    "demand ready",
    "demand sent",
    "offer received",
    "authority requested",
    "authority received",
    "recovery received",
    "matter closed",
  ]);
  return snapshots
    .flatMap((snapshot) =>
      snapshot.timeline
        .filter((item) => item.kind === "event")
        .filter((item) => meaningful.has(item.label.toLowerCase()) || item.label.toLowerCase().includes("completed"))
        .map((item) => ({ ...item, matterId: snapshot.id, matterName: snapshot.matterName }))
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function buildWorkload(matters: DashboardMatter[], snapshots: TriageMatterSnapshot[]) {
  const names = [...new Set(snapshots.map((snapshot) => snapshot.assignedFirmUser).filter((name) => name && name !== "Unassigned"))];
  return names.map((userName) => {
    const userMatters = matters.filter((matter) => matter.snapshot.assignedFirmUser === userName);
    return {
      userName,
      activeMatters: userMatters.filter((matter) => matter.snapshot.stage !== "closed" && !matter.snapshot.isArchived).length,
      overdueNextActions: userMatters.filter((matter) => matter.flags.some((flag) => flag.flagType === "overdue_next_action")).length,
      upcomingDeadlines: userMatters.filter((matter) => matter.flags.some((flag) => flag.category === "deadline")).length,
      openTasks: snapshots
        .filter((snapshot) => snapshot.assignedFirmUser === userName)
        .flatMap((snapshot) => snapshot.tasks)
        .filter((task) => task.status !== "completed" && task.status !== "canceled").length,
      readyForDemand: userMatters.filter((matter) => matter.flags.some((flag) => flag.flagType === "ready_for_demand")).length,
      staleMatters: userMatters.filter((matter) => matter.flags.some((flag) => flag.flagType === "stale_matter")).length,
    };
  }).sort((a, b) => b.overdueNextActions - a.overdueNextActions || b.upcomingDeadlines - a.upcomingDeadlines || a.userName.localeCompare(b.userName));
}

function daysUntil(date: string | null, from: Date) {
  if (!date) return Number.POSITIVE_INFINITY;
  const target = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const basis = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  return Math.ceil((target.getTime() - basis.getTime()) / 86_400_000);
}
