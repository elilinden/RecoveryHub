import { describe, expect, it } from "vitest";

import { calculateRecoveryAssessment } from "@/lib/recovery-assessment/calculation";
import { initialGeneralSubrogationModel, validateAssessmentModel, validateRecommendationBands } from "@/lib/recovery-assessment/model";
import type { AssessmentMatterSnapshot, AssessmentResponseInput } from "@/lib/recovery-assessment/types";

const matter: AssessmentMatterSnapshot = {
  matterId: "fictional-matter",
  matterName: "Fictional Recovery Matter",
  matterType: "auto_subrogation",
  amountSought: 100000,
  amountPaid: 95000,
  estimatedLegalCost: 12000,
  insuranceStatus: "confirmed_coverage",
  liabilityAssessment: "strong",
  collectabilityAssessment: "moderate",
  assignedAttorneyName: "Eli Linden",
  nextAction: "Review demand",
  statuteDeadline: "2026-10-01",
  statuteDeadlineVerified: true,
  primaryPartyNames: ["Fictional Responsible Party"],
  evidence: [
    evidence("payment_ledger"),
    evidence("police_or_incident_report"),
    evidence("repair_estimate"),
    evidence("photographs"),
    evidence("insurance_information"),
  ],
  activeTriageFlags: [],
};

function evidence(evidenceType: string) {
  return {
    id: evidenceType,
    evidenceType,
    status: "received" as const,
    dateRequested: null,
    dateReceived: "2026-07-01",
    notes: null,
    updatedAt: "2026-07-01",
  };
}

function response(factorKey: string, value: string): AssessmentResponseInput {
  const factor = initialGeneralSubrogationModel.factors.find((item) => item.factorKey === factorKey);
  if (!factor) throw new Error(`Missing factor ${factorKey}`);
  const option = factor.options.find((item) => item.value === value);
  if (!option) throw new Error(`Missing option ${value}`);
  return { factorId: factor.id, selectedOptionId: option.id, notes: "" };
}

describe("recovery assessment calculation", () => {
  it("validates the default model weights and recommendation bands", () => {
    expect(validateAssessmentModel(initialGeneralSubrogationModel)).toMatchObject({ ok: true, totalWeight: 100, bandsValid: true });
    expect(validateRecommendationBands(initialGeneralSubrogationModel.recommendationBands)).toBe(true);
  });

  it("calculates factor points, viability score, expected gross value, and expected net value", () => {
    const result = calculateRecoveryAssessment({
      model: initialGeneralSubrogationModel,
      matter,
      responses: [
        response("liability_strength", "strong"),
        response("recovery_source", "confirmed_sufficient"),
        response("evidence_quality", "adequate"),
        response("damages_documentation", "fully_documented"),
        response("collectability", "moderate"),
        response("legal_obstacles", "minor"),
        response("cost_efficiency", "reasonable"),
        response("strategic_value", "ordinary"),
      ],
      financials: {
        potentialRecoverableAmount: 100000,
        estimatedRecoveryProbability: 70,
        estimatedLegalCosts: 12000,
        estimatedThirdPartyReductions: 3000,
        amountExplanation: "",
      },
    });

    expect(result.factorResults.find((item) => item.factorKey === "liability_strength")?.pointsAwarded).toBe(16);
    expect(result.viabilityScore).toBeGreaterThan(60);
    expect(result.expectedGrossValue).toBe(70000);
    expect(result.expectedNetValue).toBe(55000);
    expect(result.dataCompletenessPercentage).toBe(100);
  });

  it("keeps unknown responses separate from proven weakness and reduces completeness", () => {
    const result = calculateRecoveryAssessment({
      model: initialGeneralSubrogationModel,
      matter,
      responses: initialGeneralSubrogationModel.factors.map((factor) => ({
        factorId: factor.id,
        selectedOptionId: factor.options.find((option) => option.value === "unknown")?.id ?? null,
        notes: "",
      })),
      financials: {
        potentialRecoverableAmount: 100000,
        estimatedRecoveryProbability: 50,
        estimatedLegalCosts: 0,
        estimatedThirdPartyReductions: 0,
        amountExplanation: "",
      },
    });

    expect(result.viabilityScore).toBe(0);
    expect(result.missingRequiredFactorCount).toBe(initialGeneralSubrogationModel.factors.length);
    expect(result.dataCompletenessPercentage).toBe(50);
    expect(result.warnings.some((warning) => warning.includes("unknown"))).toBe(true);
  });

  it("supports zero and negative expected value scenarios with decimal-safe rounding", () => {
    const result = calculateRecoveryAssessment({
      model: initialGeneralSubrogationModel,
      matter,
      responses: [],
      financials: {
        potentialRecoverableAmount: 1000.15,
        estimatedRecoveryProbability: 0,
        estimatedLegalCosts: 1200.05,
        estimatedThirdPartyReductions: 10.1,
        amountExplanation: "",
      },
    });

    expect(result.expectedGrossValue).toBe(0);
    expect(result.expectedNetValue).toBe(-1210.15);
    expect(result.warnings).toContain("Estimated costs and reductions exceed the expected gross recovery.");
  });
});
