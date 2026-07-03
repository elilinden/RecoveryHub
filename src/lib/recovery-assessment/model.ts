import type { AssessmentCategory, CalculatedRecommendation, RecommendationBand, RecoveryAssessmentFactor, RecoveryAssessmentModel } from "@/lib/recovery-assessment/types";

export const recommendationLabels: Record<CalculatedRecommendation, string> = {
  strong_recovery_candidate: "Strong recovery candidate",
  favorable_candidate: "Favorable candidate",
  further_investigation: "Further investigation or targeted action",
  attorney_review_before_expense: "Attorney review required before significant expense",
  potentially_uneconomical: "Potentially uneconomical or insufficiently supported",
};

export const attorneyConclusionLabels = {
  pursue_immediately: "Pursue immediately",
  continue_investigation: "Continue investigation",
  send_demand_when_complete: "Send demand when identified items are complete",
  review_for_arbitration: "Review for arbitration",
  review_for_litigation: "Review for litigation",
  pursue_if_costs_controlled: "Pursue only if costs remain controlled",
  place_on_hold: "Place on hold",
  recommend_closure: "Recommend closure",
  other: "Other",
} as const;

const bands: RecommendationBand[] = [
  {
    minScore: 80,
    maxScore: 100,
    recommendation: "strong_recovery_candidate",
    label: recommendationLabels.strong_recovery_candidate,
    description: "The structured assessment currently indicates strong practical recovery support.",
  },
  {
    minScore: 65,
    maxScore: 79.999,
    recommendation: "favorable_candidate",
    label: recommendationLabels.favorable_candidate,
    description: "The structured assessment currently indicates favorable recovery support.",
  },
  {
    minScore: 50,
    maxScore: 64.999,
    recommendation: "further_investigation",
    label: recommendationLabels.further_investigation,
    description: "Targeted investigation or action may materially change the assessment.",
  },
  {
    minScore: 35,
    maxScore: 49.999,
    recommendation: "attorney_review_before_expense",
    label: recommendationLabels.attorney_review_before_expense,
    description: "Review carefully before incurring significant additional expense.",
  },
  {
    minScore: 0,
    maxScore: 34.999,
    recommendation: "potentially_uneconomical",
    label: recommendationLabels.potentially_uneconomical,
    description: "The current information may not sufficiently support recovery expense.",
  },
];

function factor(
  order: number,
  factorKey: string,
  label: string,
  category: AssessmentCategory,
  weight: number,
  helpText: string,
  options: Array<[string, string, number | null, string]>
): RecoveryAssessmentFactor {
  const factorId = `general-v1-${factorKey}`;
  return {
    id: factorId,
    factorKey,
    label,
    category,
    weight,
    displayOrder: order,
    isRequired: true,
    inputType: "select",
    description: helpText,
    helpText,
    options: options.map(([value, optionLabel, scorePercentage, description], index) => ({
      id: `${factorId}-${value}`,
      factorId,
      value,
      label: optionLabel,
      scorePercentage,
      description,
      displayOrder: index + 1,
    })),
  };
}

export const initialGeneralSubrogationModel: RecoveryAssessmentModel = {
  id: "initial-general-subrogation-v1",
  name: "Initial General Subrogation Model",
  description: "Structured operational defaults for general subrogation matters.",
  matterType: "general",
  version: 1,
  isActive: true,
  effectiveFrom: "2026-07-03",
  effectiveTo: null,
  notice: "These initial weights are operational defaults and should be reviewed against the firm's actual historical results.",
  recommendationBands: bands,
  factors: [
    factor(1, "liability_strength", "Liability strength", "Liability", 20, "Evaluate the available facts supporting responsibility, including reports, admissions, witness information, comparative fault, and known defenses. The system does not independently determine liability.", [
      ["very_strong", "Very strong", 100, "Responsibility appears very well supported by the available record."],
      ["strong", "Strong", 80, "Responsibility appears well supported with manageable uncertainty."],
      ["moderate", "Moderate", 60, "Responsibility appears plausible but needs additional support."],
      ["weak", "Weak", 30, "Responsibility appears meaningfully contested or underdeveloped."],
      ["very_weak", "Very weak", 10, "Responsibility appears poorly supported on current information."],
      ["unknown", "Unknown", null, "Information is not complete enough to score this factor."],
    ]),
    factor(2, "recovery_source", "Available recovery source", "Recovery Source", 18, "Consider confirmed insurance, available limits, contractual recovery rights, responsible-party assets, and other practical sources of payment.", [
      ["confirmed_sufficient", "Confirmed insurance with sufficient limits", 100, "A practical source of payment appears confirmed."],
      ["confirmed_limited", "Confirmed insurance with potentially limited limits", 80, "Coverage exists but limits may constrain recovery."],
      ["identified_unconfirmed", "Insurance identified but unconfirmed", 60, "A source has been identified but still requires confirmation."],
      ["collectible_uninsured", "No insurance but collectible responsible party", 50, "Recovery may depend on direct collection."],
      ["uncertain", "Recovery source uncertain", 30, "The payment source remains unclear."],
      ["none_identified", "No identified viable recovery source", 10, "No viable payment source is currently identified."],
      ["unknown", "Unknown", null, "Information is not complete enough to score this factor."],
    ]),
    factor(3, "evidence_quality", "Evidence quality", "Evidence", 15, "Consider reports, photographs, video, witness statements, admissions, expert support, and preservation of evidence.", [
      ["complete_persuasive", "Complete and highly persuasive", 100, "Core evidence appears complete and highly persuasive."],
      ["strong", "Strong", 80, "Evidence appears strong with minor gaps."],
      ["adequate", "Adequate", 60, "Evidence appears adequate for continued recovery work."],
      ["incomplete", "Incomplete", 35, "Important evidence is missing or not yet confirmed."],
      ["weak", "Weak", 15, "Evidence appears weak on current information."],
      ["unknown", "Unknown", null, "Information is not complete enough to score this factor."],
    ]),
    factor(4, "damages_documentation", "Damages documentation", "Damages", 10, "Consider payment records, invoices, estimates, medical records, repair documentation, and proof of the amount sought.", [
      ["fully_documented", "Fully documented", 100, "Damages appear fully supported by records."],
      ["substantially_documented", "Substantially documented", 80, "Damages are substantially supported."],
      ["partially_documented", "Partially documented", 60, "Damages are partially supported."],
      ["documents_missing", "Significant documents missing", 30, "Important damages records are missing."],
      ["unsupported", "Unsupported", 10, "Damages are not meaningfully supported."],
      ["unknown", "Unknown", null, "Information is not complete enough to score this factor."],
    ]),
    factor(5, "collectability", "Collectability", "Collectability", 10, "Consider the practical ability to collect from the insurer, company, individual, or other responsible source.", [
      ["strong", "Strong", 100, "Collection appears practical."],
      ["moderate", "Moderate", 70, "Collection appears plausible with some uncertainty."],
      ["weak", "Weak", 40, "Collection appears difficult."],
      ["very_weak", "Very weak", 20, "Collection appears very difficult."],
      ["not_collectible", "Not currently collectible", 5, "Collection is not currently practical."],
      ["unknown", "Unknown", null, "Information is not complete enough to score this factor."],
    ]),
    factor(6, "legal_obstacles", "Legal obstacles and defenses", "Legal Obstacles", 10, "Consider limitations issues, notice requirements, comparative fault, contractual restrictions, defenses, evidentiary problems, jurisdictional issues, and other legal barriers. Do not generate legal analysis.", [
      ["none", "No significant known obstacles", 100, "No significant obstacle is currently identified."],
      ["minor", "Minor manageable obstacles", 80, "Known obstacles appear manageable."],
      ["moderate", "Moderate obstacles", 55, "Obstacles require focused review."],
      ["significant", "Significant obstacles", 25, "Known obstacles may materially impair recovery."],
      ["dispositive", "Potentially dispositive obstacle", 5, "A known obstacle may prevent practical recovery."],
      ["unknown", "Unknown", null, "Information is not complete enough to score this factor."],
    ]),
    factor(7, "cost_efficiency", "Expected cost efficiency", "Economics", 10, "Compare the likely recovery with expected attorney time, filing fees, expert costs, discovery expenses, arbitration costs, and collection expenses.", [
      ["highly_efficient", "Highly efficient", 100, "Expected recovery appears efficient relative to cost."],
      ["efficient", "Efficient", 80, "Expected recovery appears reasonably efficient."],
      ["reasonable", "Reasonable", 60, "Costs appear reasonable but should be monitored."],
      ["marginal", "Marginal", 35, "Costs may materially reduce the recovery value."],
      ["uneconomical", "Uneconomical", 10, "Costs may exceed practical recovery value."],
      ["unknown", "Unknown", null, "Information is not complete enough to score this factor."],
    ]),
    factor(8, "strategic_value", "Strategic or portfolio value", "Strategy", 7, "Consider recurring defendants, related claims, carrier relationship value, precedent, portfolio leverage, and other legitimate strategic considerations. Do not use strategic value to hide weak economic value.", [
      ["significant", "Significant strategic value", 100, "The matter has significant legitimate strategic value."],
      ["moderate", "Moderate strategic value", 75, "The matter has some strategic value."],
      ["ordinary", "Ordinary value", 55, "The matter has ordinary portfolio value."],
      ["limited", "Limited strategic value", 30, "The matter has limited strategic value."],
      ["none", "No separate strategic value", 10, "No separate strategic value is currently identified."],
      ["unknown", "Unknown", null, "Information is not complete enough to score this factor."],
    ]),
  ],
};

export function validateAssessmentModel(model: RecoveryAssessmentModel) {
  const totalWeight = model.factors.reduce((total, factorItem) => total + factorItem.weight, 0);
  const bandsValid = validateRecommendationBands(model.recommendationBands);
  return {
    ok: Math.abs(totalWeight - 100) < 0.001 && bandsValid,
    totalWeight,
    bandsValid,
  };
}

export function validateRecommendationBands(inputBands: RecommendationBand[]) {
  const sorted = [...inputBands].sort((a, b) => a.minScore - b.minScore);
  if (sorted.length === 0 || sorted[0].minScore !== 0 || sorted.at(-1)?.maxScore !== 100) return false;
  return sorted.every((band, index) => {
    const next = sorted[index + 1];
    return band.minScore <= band.maxScore && (!next || band.maxScore < next.minScore);
  });
}
