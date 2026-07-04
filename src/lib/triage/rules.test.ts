import { describe, expect, it } from "vitest";

import { defaultTriageSettings } from "@/lib/triage/settings";
import { evaluateMatterTriage } from "@/lib/triage/rules";
import type { TriageMatterSnapshot } from "@/lib/triage/types";

const now = new Date("2026-07-03T12:00:00.000Z");

function snapshot(overrides: Partial<TriageMatterSnapshot> = {}): TriageMatterSnapshot {
  return {
    id: "test-matter",
    matterName: "Fictional Recovery Matter",
    carrierName: "Fictional Carrier",
    matterType: "auto_subrogation",
    intakeStatus: "complete",
    stage: "investigation",
    priority: "normal",
    isArchived: false,
    dateReferred: "2026-06-25",
    createdAt: "2026-06-25",
    lastUpdated: "2026-07-02",
    lastAutosavedAt: null,
    amountSought: 12500,
    amountPaid: 12000,
    insuranceStatus: "confirmed_coverage",
    liabilityAssessment: "moderate",
    statuteDeadline: "2026-10-01",
    statuteDeadlineVerified: true,
    nextAction: "Prepare demand",
    nextActionDueDate: "2026-07-08",
    assignedFirmUser: "Eli Linden",
    assignedAttorneyName: "Eli Linden",
    assignedStaffName: null,
    assignedAdjusterName: "Riley Vale",
    daysSinceLastSubstantiveActivity: 5,
    lastSubstantiveActivityAt: "2026-06-28",
    primaryPartyNames: ["Fictional Responsible Party"],
    evidence: [
      evidence("payment_ledger"),
      evidence("police_or_incident_report"),
      evidence("repair_estimate"),
      evidence("photographs"),
      evidence("insurance_information"),
    ],
    tasks: [],
    deadlines: [],
    timeline: [],
    ...overrides,
  };
}

function evidence(evidenceType: string) {
  return {
    id: evidenceType,
    evidenceType,
    status: "received" as const,
    dateRequested: "2026-06-20",
    dateReceived: "2026-06-21",
    notes: null,
    updatedAt: "2026-06-21",
  };
}

describe("evaluateMatterTriage", () => {
  it("triggers overdue next action and not for future next action", () => {
    const overdue = evaluateMatterTriage(snapshot({ nextActionDueDate: "2026-06-27" }), defaultTriageSettings, now);
    expect(overdue.flags.some((flag) => flag.flagType === "overdue_next_action")).toBe(true);

    const future = evaluateMatterTriage(snapshot({ nextActionDueDate: "2026-07-08" }), defaultTriageSettings, now);
    expect(future.flags.some((flag) => flag.flagType === "overdue_next_action")).toBe(false);
  });

  it("does not trigger active operational flags for closed matters", () => {
    const closed = evaluateMatterTriage(snapshot({
      stage: "closed",
      nextAction: null,
      nextActionDueDate: null,
      daysSinceLastSubstantiveActivity: 90,
    }), defaultTriageSettings, now);
    expect(closed.flags.some((flag) => flag.flagType === "missing_next_action" || flag.flagType === "stale_matter")).toBe(false);
  });

  it("distinguishes urgent, upcoming, unverified, and missing statute deadlines", () => {
    expect(evaluateMatterTriage(snapshot({ statuteDeadline: "2026-07-20" }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "urgent_statute_deadline")).toBe(true);
    expect(evaluateMatterTriage(snapshot({ statuteDeadline: "2026-09-01" }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "upcoming_statute_deadline")).toBe(true);
    expect(evaluateMatterTriage(snapshot({ statuteDeadlineVerified: false }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "unverified_statute_deadline")).toBe(true);
    expect(evaluateMatterTriage(snapshot({ statuteDeadline: null }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "missing_statute_deadline")).toBe(true);
  });

  it("uses substantive activity for stale matter detection", () => {
    expect(evaluateMatterTriage(snapshot({ daysSinceLastSubstantiveActivity: 42 }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "stale_matter")).toBe(true);
    expect(evaluateMatterTriage(snapshot({ daysSinceLastSubstantiveActivity: 3, lastAutosavedAt: "2026-07-03T10:00:00.000Z" }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "stale_matter")).toBe(false);
  });

  it("triggers missing assignment, responsible party, insurance, liability, financial, and payment flags", () => {
    const flags = evaluateMatterTriage(snapshot({
      assignedAttorneyName: null,
      assignedStaffName: null,
      assignedFirmUser: "Unassigned",
      primaryPartyNames: [],
      insuranceStatus: "unknown",
      liabilityAssessment: "unknown",
      amountSought: 0,
      evidence: [],
      stage: "investigation",
    }), defaultTriageSettings, now).flags.map((flag) => flag.flagType);

    expect(flags).toContain("missing_assignment");
    expect(flags).toContain("responsible_party_missing");
    expect(flags).toContain("insurance_status_unknown");
    expect(flags).toContain("liability_assessment_unknown");
    expect(flags).toContain("financial_information_missing");
  });

  it("triggers overdue task, awaiting response, awaiting client, draft intake, and new referral rules", () => {
    const overdueTask = evaluateMatterTriage(snapshot({
      tasks: [{
        id: "task-1",
        title: "Call adjuster",
        description: null,
        assignedToName: "Eli Linden",
        dueDate: "2026-06-30",
        priority: "high",
        status: "not_started",
        completedAt: null,
        createdByName: "Eli Linden",
      }],
    }), defaultTriageSettings, now);
    expect(overdueTask.flags.some((flag) => flag.flagType === "overdue_task")).toBe(true);

    expect(evaluateMatterTriage(snapshot({
      timeline: [{
        id: "event-1",
        kind: "event",
        occurredAt: "2026-06-10T12:00:00.000Z",
        label: "Demand sent",
        description: "Demand sent.",
        actorName: "Eli Linden",
        actorId: "profile-1",
        source: "manual",
        isStruckThrough: false,
      }],
    }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "awaiting_response")).toBe(true);

    expect(evaluateMatterTriage(snapshot({
      nextAction: "Confirm carrier authority",
      nextActionDueDate: "2026-06-30",
    }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "awaiting_client")).toBe(true);

    expect(evaluateMatterTriage(snapshot({
      intakeStatus: "in_progress",
      lastAutosavedAt: "2026-06-20T12:00:00.000Z",
    }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "draft_intake")).toBe(true);

    expect(evaluateMatterTriage(snapshot({
      stage: "new_referral",
      dateReferred: "2026-06-25",
    }), defaultTriageSettings, now).flags.some((flag) => flag.flagType === "new_referral_unreviewed")).toBe(true);
  });

  it("only triggers ready for demand when all configured conditions are met and resolves after stage advances", () => {
    const ready = evaluateMatterTriage(snapshot(), defaultTriageSettings, now);
    expect(ready.flags.some((flag) => flag.flagType === "ready_for_demand")).toBe(true);

    const advanced = evaluateMatterTriage(snapshot({ stage: "demand_pending" }), defaultTriageSettings, now);
    expect(advanced.flags.some((flag) => flag.flagType === "ready_for_demand")).toBe(false);

    const missingEvidence = evaluateMatterTriage(snapshot({ evidence: [evidence("payment_ledger")] }), defaultTriageSettings, now);
    expect(missingEvidence.flags.some((flag) => flag.flagType === "ready_for_demand")).toBe(false);
  });
});
