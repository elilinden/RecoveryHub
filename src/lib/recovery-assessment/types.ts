import type { AssessmentLevel, EvidenceItem, InsuranceStatus, MatterDetail, MatterType } from "@/lib/matters-workspace/types";
import type { TriageFlag } from "@/lib/triage/types";

export type AssessmentStatus = "draft" | "finalized" | "superseded" | "canceled";
export type AssessmentInputType = "rating_scale" | "boolean" | "select" | "percentage" | "currency" | "numeric" | "text_note";
export type AssessmentCategory =
  | "Liability"
  | "Recovery Source"
  | "Evidence"
  | "Damages"
  | "Legal Obstacles"
  | "Collectability"
  | "Economics"
  | "Strategy";

export type AttorneyConclusion =
  | "pursue_immediately"
  | "continue_investigation"
  | "send_demand_when_complete"
  | "review_for_arbitration"
  | "review_for_litigation"
  | "pursue_if_costs_controlled"
  | "place_on_hold"
  | "recommend_closure"
  | "other";

export type CalculatedRecommendation =
  | "strong_recovery_candidate"
  | "favorable_candidate"
  | "further_investigation"
  | "attorney_review_before_expense"
  | "potentially_uneconomical";

export type RecoveryAssessmentModel = {
  id: string;
  name: string;
  description: string;
  matterType: MatterType | "general";
  version: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  notice: string;
  factors: RecoveryAssessmentFactor[];
  recommendationBands: RecommendationBand[];
};

export type RecoveryAssessmentFactor = {
  id: string;
  factorKey: string;
  label: string;
  description: string;
  category: AssessmentCategory;
  inputType: AssessmentInputType;
  weight: number;
  isRequired: boolean;
  displayOrder: number;
  helpText: string;
  options: RecoveryAssessmentFactorOption[];
};

export type RecoveryAssessmentFactorOption = {
  id: string;
  factorId: string;
  value: string;
  label: string;
  scorePercentage: number | null;
  description: string;
  displayOrder: number;
};

export type RecommendationBand = {
  minScore: number;
  maxScore: number;
  recommendation: CalculatedRecommendation;
  label: string;
  description: string;
};

export type AssessmentResponseInput = {
  factorId: string;
  selectedOptionId: string | null;
  notes: string;
};

export type AssessmentResponse = AssessmentResponseInput & {
  id: string;
  assessmentId: string;
  factorKey: string;
  factorLabel: string;
  selectedOptionLabel: string | null;
  factorWeightSnapshot: number;
  scorePercentageSnapshot: number | null;
  pointsAwarded: number;
  isMissing: boolean;
};

export type AssessmentFinancialInput = {
  potentialRecoverableAmount: number;
  estimatedRecoveryProbability: number;
  estimatedLegalCosts: number;
  estimatedThirdPartyReductions: number;
  amountExplanation: string;
};

export type AssessmentCalculation = {
  viabilityScore: number;
  expectedGrossValue: number;
  expectedNetValue: number;
  dataCompletenessPercentage: number;
  dataCompletenessLabel: string;
  calculatedRecommendation: CalculatedRecommendation;
  calculatedRecommendationLabel: string;
  factorResults: AssessmentResponse[];
  missingRequiredFactorCount: number;
  formula: {
    scoreFormula: string;
    expectedGrossValueFormula: string;
    expectedNetValueFormula: string;
    completenessFormula: string;
  };
  warnings: string[];
};

export type RecoveryAssessment = AssessmentFinancialInput & AssessmentCalculation & {
  id: string;
  matterId: string;
  assessmentModelId: string;
  assessmentModelVersion: number;
  status: AssessmentStatus;
  attorneyConclusion: AttorneyConclusion | null;
  attorneyConclusionLabel: string | null;
  assessmentSummary: string | null;
  assumptions: string | null;
  completedByName: string | null;
  finalizedByName: string | null;
  finalizedAt: string | null;
  supersededAt: string | null;
  createdAt: string;
  updatedAt: string;
  overrideReason: string | null;
};

export type AssessmentMatterSnapshot = {
  matterId: string;
  matterName: string;
  matterType: MatterType;
  amountSought: number;
  amountPaid: number;
  estimatedLegalCost: number;
  insuranceStatus: InsuranceStatus;
  liabilityAssessment: AssessmentLevel;
  collectabilityAssessment: AssessmentLevel;
  assignedAttorneyName: string | null;
  nextAction: string | null;
  statuteDeadline: string | null;
  statuteDeadlineVerified: boolean;
  primaryPartyNames: string[];
  evidence: EvidenceItem[];
  activeTriageFlags: TriageFlag[];
};

export function createAssessmentSnapshot(matter: MatterDetail, activeTriageFlags: TriageFlag[] = []): AssessmentMatterSnapshot {
  return {
    matterId: matter.id,
    matterName: matter.matterName,
    matterType: matter.matterType,
    amountSought: matter.amountSought,
    amountPaid: matter.amountPaid,
    estimatedLegalCost: matter.estimatedLegalCost,
    insuranceStatus: matter.insuranceStatus,
    liabilityAssessment: matter.liabilityAssessment,
    collectabilityAssessment: matter.collectabilityAssessment,
    assignedAttorneyName: matter.assignedAttorneyName,
    nextAction: matter.nextAction,
    statuteDeadline: matter.statuteDeadline,
    statuteDeadlineVerified: matter.statuteDeadlineVerified,
    primaryPartyNames: matter.primaryPartyNames,
    evidence: matter.evidence,
    activeTriageFlags,
  };
}
