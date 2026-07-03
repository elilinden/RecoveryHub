import { recommendationLabels } from "@/lib/recovery-assessment/model";
import type {
  AssessmentCalculation,
  AssessmentFinancialInput,
  AssessmentMatterSnapshot,
  AssessmentResponse,
  AssessmentResponseInput,
  RecoveryAssessmentModel,
} from "@/lib/recovery-assessment/types";

export function calculateRecoveryAssessment(input: {
  model: RecoveryAssessmentModel;
  matter: AssessmentMatterSnapshot;
  responses: AssessmentResponseInput[];
  financials: AssessmentFinancialInput;
}): AssessmentCalculation {
  const responseByFactor = new Map(input.responses.map((response) => [response.factorId, response]));
  const factorResults = input.model.factors
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((factor) => {
      const response = responseByFactor.get(factor.id);
      const selectedOption = factor.options.find((option) => option.id === response?.selectedOptionId) ?? null;
      const scorePercentage = selectedOption?.scorePercentage ?? null;
      const isMissing = !selectedOption || scorePercentage === null;
      const pointsAwarded = isMissing ? 0 : roundScore((factor.weight * scorePercentage) / 100);
      return {
        id: `${factor.id}-response`,
        assessmentId: "",
        factorId: factor.id,
        factorKey: factor.factorKey,
        factorLabel: factor.label,
        selectedOptionId: selectedOption?.id ?? null,
        selectedOptionLabel: selectedOption?.label ?? null,
        factorWeightSnapshot: factor.weight,
        scorePercentageSnapshot: scorePercentage,
        pointsAwarded,
        isMissing,
        notes: response?.notes?.trim() ?? "",
      } satisfies AssessmentResponse;
    });

  const viabilityScore = clamp(roundScore(factorResults.reduce((total, item) => total + item.pointsAwarded, 0)), 0, 100);
  const expectedGrossValue = centsToMoney(Math.round(moneyToCents(input.financials.potentialRecoverableAmount) * (input.financials.estimatedRecoveryProbability / 100)));
  const expectedNetValue = centsToMoney(
    moneyToCents(expectedGrossValue)
    - moneyToCents(input.financials.estimatedLegalCosts)
    - moneyToCents(input.financials.estimatedThirdPartyReductions)
  );
  const dataCompletenessPercentage = calculateCompleteness(input.matter, factorResults, input.model);
  const calculatedRecommendation = input.model.recommendationBands.find((band) => viabilityScore >= band.minScore && viabilityScore <= band.maxScore)?.recommendation ?? "potentially_uneconomical";
  const missingRequiredFactorCount = factorResults.filter((result) => result.isMissing).length;
  const warnings = buildWarnings({
    financials: input.financials,
    expectedNetValue,
    dataCompletenessPercentage,
    missingRequiredFactorCount,
  });

  return {
    viabilityScore,
    expectedGrossValue,
    expectedNetValue,
    dataCompletenessPercentage,
    dataCompletenessLabel: completenessLabel(dataCompletenessPercentage),
    calculatedRecommendation,
    calculatedRecommendationLabel: recommendationLabels[calculatedRecommendation],
    factorResults,
    missingRequiredFactorCount,
    formula: {
      scoreFormula: "Factor weight x selected option score percentage = points awarded; sum of points awarded = Viability Score.",
      expectedGrossValueFormula: "Potential Recoverable Amount x Estimated Recovery Probability = Expected Gross Value.",
      expectedNetValueFormula: "Expected Gross Value - Estimated Legal Costs - Estimated Third-Party Reductions = Expected Net Value.",
      completenessFormula: "Assessment factors 50%, core matter information 25%, evidence documentation 25%.",
    },
    warnings,
  };
}

export function calculateCompleteness(
  matter: AssessmentMatterSnapshot,
  factorResults: AssessmentResponse[],
  model: RecoveryAssessmentModel
) {
  const requiredFactors = model.factors.filter((factor) => factor.isRequired);
  const completeFactors = factorResults.filter((response) => !response.isMissing).length;
  const factorCompleteness = requiredFactors.length === 0 ? 100 : (completeFactors / requiredFactors.length) * 100;

  const coreChecks = [
    matter.amountSought >= 0,
    matter.primaryPartyNames.length > 0,
    matter.insuranceStatus !== "unknown",
    matter.liabilityAssessment !== "unknown",
    Boolean(matter.assignedAttorneyName),
    Boolean(matter.nextAction),
    Boolean(matter.statuteDeadline),
    matter.statuteDeadlineVerified,
  ];
  const coreCompleteness = (coreChecks.filter(Boolean).length / coreChecks.length) * 100;

  const requiredEvidence = ["payment_ledger", "police_or_incident_report", "repair_estimate", "photographs", "insurance_information"];
  const completeEvidence = requiredEvidence.filter((type) =>
    matter.evidence.some((item) => item.evidenceType === type && ["received", "not_available", "not_applicable"].includes(item.status))
  ).length;
  const evidenceCompleteness = (completeEvidence / requiredEvidence.length) * 100;

  return roundScore((factorCompleteness * 0.5) + (coreCompleteness * 0.25) + (evidenceCompleteness * 0.25));
}

export function completenessLabel(value: number) {
  if (value >= 90) return "Highly complete";
  if (value >= 75) return "Substantially complete";
  if (value >= 50) return "Partially complete";
  return "Material information missing";
}

export function moneyToCents(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100);
}

export function centsToMoney(value: number) {
  return Number((value / 100).toFixed(2));
}

export function roundScore(value: number) {
  return Number(value.toFixed(1));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildWarnings(input: {
  financials: AssessmentFinancialInput;
  expectedNetValue: number;
  dataCompletenessPercentage: number;
  missingRequiredFactorCount: number;
}) {
  const warnings: string[] = [];
  if (input.expectedNetValue < 0) warnings.push("Estimated costs and reductions exceed the expected gross recovery.");
  if (input.dataCompletenessPercentage < 50) warnings.push("The assessment is based on materially incomplete information.");
  if (input.missingRequiredFactorCount > 0) {
    warnings.push(`${input.missingRequiredFactorCount} required ${input.missingRequiredFactorCount === 1 ? "factor remains" : "factors remain"} unknown.`);
  }
  if (input.financials.estimatedRecoveryProbability > 90 || input.financials.estimatedRecoveryProbability < 10) {
    warnings.push("Very high or very low estimated recovery probability requires an explanatory note before finalization.");
  }
  return warnings;
}
