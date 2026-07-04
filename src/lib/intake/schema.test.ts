import { describe, expect, it } from "vitest";

import { filterContactsByCarrier, type IntakeCarrierContact } from "./types";
import {
  calculateSuggestedAmountSought,
  createEmptyIntake,
  getIntakeIssueGroups,
  intakeSchema,
  recommendedEvidenceByMatterType,
  validateIntakeStep,
} from "./schema";

describe("intake schema", () => {
  it("calculates the suggested amount sought from paid, deductible, and expenses", () => {
    expect(
      calculateSuggestedAmountSought({
        amountPaid: "1250.25",
        deductible: "500",
        recoverableExpenses: "42.10",
      })
    ).toBe("1792.35");
  });

  it("distinguishes missing financial values from confirmed zero values", () => {
    expect(calculateSuggestedAmountSought({ amountPaid: "", deductible: "", recoverableExpenses: "" })).toBe("");
    expect(calculateSuggestedAmountSought({ amountPaid: "0", deductible: "0.00", recoverableExpenses: "0" })).toBe("0.00");
  });

  it("separates intake blockers from follow-up issues", () => {
    const intake = createEmptyIntake();
    const initial = getIntakeIssueGroups(intake);
    expect(initial.required).toContain("Missing carrier.");
    expect(initial.followUp).toContain("Adjuster not assigned.");

    intake.stepOne.carrierId = "carrier-1";
    intake.stepOne.carrierClaimNumber = "CLAIM-100";
    intake.stepOne.assignedAttorneyId = "user-1";
    intake.stepThree.nextActionDueDate = "2026-07-10";
    const completed = getIntakeIssueGroups(intake);
    expect(completed.required).toEqual([]);
    expect(completed.followUp).toContain("Responsible party not identified.");
  });

  it("starts intake with no selected evidence and exposes auto-subrogation recommendations", () => {
    const intake = createEmptyIntake();
    expect(intake.stepTwo.evidence).toEqual([]);
    expect(recommendedEvidenceByMatterType.auto_subrogation).toEqual([
      "police_or_incident_report",
      "photographs",
      "repair_estimate",
      "repair_invoice",
      "payment_ledger",
      "insurance_information",
    ]);
  });

  it("requires a responsible firm user before completing matter details", () => {
    const intake = createEmptyIntake();
    intake.stepOne.carrierId = "carrier-1";
    intake.stepOne.carrierClaimNumber = "CLAIM-100";
    intake.stepOne.matterName = "Test Carrier v. Test Party";

    expect(validateIntakeStep(1, intake).success).toBe(false);

    intake.stepOne.assignedAttorneyId = "user-1";
    expect(validateIntakeStep(1, intake).success).toBe(true);
  });

  it("requires either a statute deadline or an explicit unknown-deadline acknowledgement", () => {
    const intake = createEmptyIntake();
    intake.stepThree.nextActionDueDate = "2026-07-10";
    intake.stepThree.nextActionAssignedTo = "user-1";

    expect(validateIntakeStep(3, intake).success).toBe(false);

    intake.stepThree.statuteDeadlineUnknownAcknowledged = true;
    expect(validateIntakeStep(3, intake).success).toBe(true);
  });

  it("accepts a complete intake shape with health-plan matter-specific data", () => {
    const intake = createEmptyIntake();
    intake.stepOne.carrierId = "carrier-1";
    intake.stepOne.carrierClaimNumber = "CLAIM-101";
    intake.stepOne.matterName = "Health Plan Recovery Test";
    intake.stepOne.matterType = "health_plan_recovery";
    intake.stepOne.assignedAttorneyId = "user-1";
    intake.stepTwo.healthPlan = {
      medicareStatus: "unknown",
      medicaidStatus: "no",
      ssdiEligibility: "unknown",
      erisaPlanStatus: "yes",
      fundingStatus: "unknown",
      masterPlanDocumentReceived: "no",
      conditionalPaymentStatus: "not_applicable",
    };
    intake.stepThree.statuteDeadline = "2026-08-01";
    intake.stepThree.nextActionDueDate = "2026-07-10";
    intake.stepThree.nextActionAssignedTo = "user-1";

    expect(intakeSchema.safeParse(intake).success).toBe(true);
  });

  it("filters carrier contacts by carrier and contact type", () => {
    const contacts: IntakeCarrierContact[] = [
      { id: "1", carrierId: "carrier-1", fullName: "Alex Adjuster", contactType: "adjuster" },
      { id: "2", carrierId: "carrier-1", fullName: "Sam Supervisor", contactType: "supervisor" },
      { id: "3", carrierId: "carrier-2", fullName: "Morgan Adjuster", contactType: "adjuster" },
    ];

    expect(filterContactsByCarrier(contacts, "carrier-1", "adjuster")).toEqual([contacts[0]]);
  });
});
