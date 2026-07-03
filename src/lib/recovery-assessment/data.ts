import type { Profile } from "@/lib/data/profiles";
import { loadMatterDetail } from "@/lib/matters-workspace/data";
import type { MatterDetail, MatterType } from "@/lib/matters-workspace/types";
import { centsToMoney, moneyToCents, calculateRecoveryAssessment } from "@/lib/recovery-assessment/calculation";
import { attorneyConclusionLabels, initialGeneralSubrogationModel, recommendationLabels } from "@/lib/recovery-assessment/model";
import type {
  AssessmentFinancialInput,
  AssessmentResponse,
  AssessmentResponseInput,
  RecoveryAssessment,
  RecoveryAssessmentFactor,
  RecoveryAssessmentFactorOption,
  RecoveryAssessmentModel,
} from "@/lib/recovery-assessment/types";
import { createAssessmentSnapshot } from "@/lib/recovery-assessment/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type ModelRow = {
  id: string;
  name: string;
  description: string;
  matter_type: MatterType | "general";
  version: number;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  recommendation_bands: Json;
};

type FactorRow = {
  id: string;
  assessment_model_id: string;
  factor_key: string;
  label: string;
  description: string;
  category: RecoveryAssessmentFactor["category"];
  input_type: RecoveryAssessmentFactor["inputType"];
  weight: string | number;
  is_required: boolean;
  display_order: number;
  help_text: string;
  is_active: boolean;
};

type OptionRow = {
  id: string;
  factor_id: string;
  value: string;
  label: string;
  score_percentage: string | number | null;
  description: string;
  display_order: number;
};

type AssessmentRow = {
  id: string;
  matter_id: string;
  assessment_model_id: string;
  assessment_model_version: number;
  status: RecoveryAssessment["status"];
  viability_score: string | number;
  potential_recoverable_amount: string | number;
  estimated_recovery_probability: string | number;
  expected_gross_value: string | number;
  estimated_legal_costs: string | number;
  estimated_third_party_reductions: string | number;
  expected_net_value: string | number;
  data_completeness_percentage: string | number;
  calculated_recommendation: RecoveryAssessment["calculatedRecommendation"];
  attorney_conclusion: RecoveryAssessment["attorneyConclusion"];
  assessment_summary: string | null;
  assumptions: string | null;
  amount_explanation: string | null;
  completed_by: string | null;
  finalized_by: string | null;
  finalized_at: string | null;
  superseded_at: string | null;
  created_at: string;
  updated_at: string;
};

type ResponseRow = {
  id: string;
  assessment_id: string;
  factor_id: string;
  selected_option_id: string | null;
  factor_weight_snapshot: string | number;
  score_percentage_snapshot: string | number | null;
  points_awarded: string | number;
  is_missing: boolean;
  notes: string | null;
};

type OverrideRow = {
  assessment_id: string;
  reason: string;
};

export type MatterAssessmentBundle = {
  model: RecoveryAssessmentModel;
  current: RecoveryAssessment | null;
  draft: RecoveryAssessment | null;
  history: RecoveryAssessment[];
};

export type AssessmentSummary = {
  matterId: string;
  matterName: string;
  assignedAttorneyName: string | null;
  current: RecoveryAssessment | null;
  draft: RecoveryAssessment | null;
};

export async function loadAssessmentModelForMatter(matterType: MatterType): Promise<RecoveryAssessmentModel> {
  if (!isSupabaseConfigured()) return initialGeneralSubrogationModel;

  const supabase = await createClient();
  const { data: modelRows } = await supabase
    .from("recovery_assessment_models")
    .select("*")
    .eq("is_active", true)
    .in("matter_type", [matterType, "general"])
    .order("matter_type", { ascending: true })
    .order("version", { ascending: false })
    .limit(1);

  const modelRow = ((modelRows ?? []) as unknown as ModelRow[])[0];
  if (!modelRow) return initialGeneralSubrogationModel;

  const [{ data: factorRows }, { data: optionRows }] = await Promise.all([
    supabase.from("recovery_assessment_factors").select("*").eq("assessment_model_id", modelRow.id).eq("is_active", true).order("display_order"),
    supabase.from("recovery_assessment_factor_options").select("*").order("display_order"),
  ]);
  return mapModel(modelRow, (factorRows ?? []) as unknown as FactorRow[], (optionRows ?? []) as unknown as OptionRow[]);
}

export async function loadMatterAssessmentBundle(matter: MatterDetail): Promise<MatterAssessmentBundle> {
  const model = await loadAssessmentModelForMatter(matter.matterType);

  if (!isSupabaseConfigured()) {
    const assessments = buildDevelopmentAssessments(matter, model);
    return {
      model,
      current: assessments.find((assessment) => assessment.status === "finalized") ?? null,
      draft: assessments.find((assessment) => assessment.status === "draft") ?? null,
      history: assessments,
    };
  }

  const supabase = await createClient();
  const [{ data: assessmentRows }, { data: responseRows }, { data: overrideRows }] = await Promise.all([
    supabase.from("recovery_assessments").select("*").eq("matter_id", matter.id).order("created_at", { ascending: false }),
    supabase.from("recovery_assessment_responses").select("*"),
    supabase.from("recovery_assessment_overrides").select("assessment_id,reason"),
  ]);
  const assessments = ((assessmentRows ?? []) as unknown as AssessmentRow[]).map((row) =>
    mapAssessment(row, model, (responseRows ?? []) as unknown as ResponseRow[], (overrideRows ?? []) as unknown as OverrideRow[])
  );

  return {
    model,
    current: assessments.find((assessment) => assessment.status === "finalized") ?? null,
    draft: assessments.find((assessment) => assessment.status === "draft") ?? null,
    history: assessments,
  };
}

export async function loadAssessmentSummariesForMatters(matters: MatterDetail[]): Promise<AssessmentSummary[]> {
  if (!isSupabaseConfigured()) {
    return Promise.all(matters.map(async (matter) => {
      const bundle = await loadMatterAssessmentBundle(matter);
      return { matterId: matter.id, matterName: matter.matterName, assignedAttorneyName: matter.assignedAttorneyName, current: bundle.current, draft: bundle.draft };
    }));
  }

  return Promise.all(matters.map(async (matter) => {
    const bundle = await loadMatterAssessmentBundle(matter);
    return { matterId: matter.id, matterName: matter.matterName, assignedAttorneyName: matter.assignedAttorneyName, current: bundle.current, draft: bundle.draft };
  }));
}

export async function loadAssessmentSummariesForMatterIds(matterIds: string[], profile: Profile): Promise<AssessmentSummary[]> {
  const matters = await Promise.all(matterIds.map(async (matterId) => {
    try {
      return await loadMatterDetail(matterId, profile);
    } catch {
      return null;
    }
  }));
  return loadAssessmentSummariesForMatters(matters.filter((matter): matter is MatterDetail => Boolean(matter)));
}

export async function loadMatterForAssessment(matterId: string, profile: Profile) {
  const matter = await loadMatterDetail(matterId, profile);
  const bundle = await loadMatterAssessmentBundle(matter);
  return { matter, bundle };
}

export function buildBlankResponseInputs(model: RecoveryAssessmentModel): AssessmentResponseInput[] {
  return model.factors.map((factor) => ({
    factorId: factor.id,
    selectedOptionId: factor.options.find((option) => option.value === "unknown")?.id ?? null,
    notes: "",
  }));
}

export function defaultFinancials(matter: MatterDetail): AssessmentFinancialInput {
  return {
    potentialRecoverableAmount: matter.amountSought,
    estimatedRecoveryProbability: 50,
    estimatedLegalCosts: matter.estimatedLegalCost,
    estimatedThirdPartyReductions: 0,
    amountExplanation: "",
  };
}

function mapModel(modelRow: ModelRow, factorRows: FactorRow[], optionRows: OptionRow[]): RecoveryAssessmentModel {
  const optionsByFactor = groupBy(optionRows, (option) => option.factor_id);
  return {
    id: modelRow.id,
    name: modelRow.name,
    description: modelRow.description,
    matterType: modelRow.matter_type,
    version: modelRow.version,
    isActive: modelRow.is_active,
    effectiveFrom: modelRow.effective_from,
    effectiveTo: modelRow.effective_to,
    notice: "These initial weights are operational defaults and should be reviewed against the firm's actual historical results.",
    recommendationBands: initialGeneralSubrogationModel.recommendationBands,
    factors: factorRows.map((row) => ({
      id: row.id,
      factorKey: row.factor_key,
      label: row.label,
      description: row.description,
      category: row.category,
      inputType: row.input_type,
      weight: numberFrom(row.weight),
      isRequired: row.is_required,
      displayOrder: row.display_order,
      helpText: row.help_text,
      options: (optionsByFactor.get(row.id) ?? []).map(mapOption),
    })),
  };
}

function mapOption(row: OptionRow): RecoveryAssessmentFactorOption {
  return {
    id: row.id,
    factorId: row.factor_id,
    value: row.value,
    label: row.label,
    scorePercentage: row.score_percentage === null ? null : numberFrom(row.score_percentage),
    description: row.description,
    displayOrder: row.display_order,
  };
}

function mapAssessment(row: AssessmentRow, model: RecoveryAssessmentModel, responseRows: ResponseRow[], overrideRows: OverrideRow[]): RecoveryAssessment {
  const responses = responseRows.filter((response) => response.assessment_id === row.id);
  const factorResults = model.factors.map((factor) => {
    const response = responses.find((item) => item.factor_id === factor.id);
    const selectedOption = factor.options.find((option) => option.id === response?.selected_option_id) ?? null;
    return {
      id: response?.id ?? `${row.id}-${factor.id}`,
      assessmentId: row.id,
      factorId: factor.id,
      factorKey: factor.factorKey,
      factorLabel: factor.label,
      selectedOptionId: response?.selected_option_id ?? null,
      selectedOptionLabel: selectedOption?.label ?? null,
      factorWeightSnapshot: numberFrom(response?.factor_weight_snapshot ?? factor.weight),
      scorePercentageSnapshot: response?.score_percentage_snapshot === null || response?.score_percentage_snapshot === undefined ? null : numberFrom(response.score_percentage_snapshot),
      pointsAwarded: numberFrom(response?.points_awarded ?? 0),
      isMissing: response?.is_missing ?? true,
      notes: response?.notes ?? "",
    } satisfies AssessmentResponse;
  });
  const completeness = numberFrom(row.data_completeness_percentage);
  const expectedNetValue = numberFrom(row.expected_net_value);
  return {
    id: row.id,
    matterId: row.matter_id,
    assessmentModelId: row.assessment_model_id,
    assessmentModelVersion: row.assessment_model_version,
    status: row.status,
    viabilityScore: numberFrom(row.viability_score),
    potentialRecoverableAmount: numberFrom(row.potential_recoverable_amount),
    estimatedRecoveryProbability: numberFrom(row.estimated_recovery_probability),
    expectedGrossValue: numberFrom(row.expected_gross_value),
    estimatedLegalCosts: numberFrom(row.estimated_legal_costs),
    estimatedThirdPartyReductions: numberFrom(row.estimated_third_party_reductions),
    expectedNetValue,
    dataCompletenessPercentage: completeness,
    dataCompletenessLabel: completeness >= 90 ? "Highly complete" : completeness >= 75 ? "Substantially complete" : completeness >= 50 ? "Partially complete" : "Material information missing",
    calculatedRecommendation: row.calculated_recommendation,
    calculatedRecommendationLabel: recommendationLabels[row.calculated_recommendation],
    factorResults,
    missingRequiredFactorCount: factorResults.filter((result) => result.isMissing).length,
    formula: {
      scoreFormula: "Stored factor snapshots determine this historical score.",
      expectedGrossValueFormula: "Potential Recoverable Amount x Estimated Recovery Probability = Expected Gross Value.",
      expectedNetValueFormula: "Expected Gross Value - Estimated Legal Costs - Estimated Third-Party Reductions = Expected Net Value.",
      completenessFormula: "Assessment factors 50%, core matter information 25%, evidence documentation 25%.",
    },
    warnings: expectedNetValue < 0 ? ["Estimated costs and reductions exceed the expected gross recovery."] : [],
    attorneyConclusion: row.attorney_conclusion,
    attorneyConclusionLabel: row.attorney_conclusion ? attorneyConclusionLabels[row.attorney_conclusion] : null,
    assessmentSummary: row.assessment_summary,
    assumptions: row.assumptions,
    amountExplanation: row.amount_explanation ?? "",
    completedByName: row.completed_by,
    finalizedByName: row.finalized_by,
    finalizedAt: row.finalized_at,
    supersededAt: row.superseded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    overrideReason: overrideRows.find((override) => override.assessment_id === row.id)?.reason ?? null,
  };
}

function buildDevelopmentAssessments(matter: MatterDetail, model: RecoveryAssessmentModel): RecoveryAssessment[] {
  if (matter.id === "rivergate-slip-loss") return [];
  const factorValues: Record<string, string> = matter.id === "harbor-bend-storage-loss"
    ? {
        liability_strength: "moderate",
        recovery_source: "identified_unconfirmed",
        evidence_quality: "incomplete",
        damages_documentation: "documents_missing",
        collectability: "moderate",
        legal_obstacles: "moderate",
        cost_efficiency: "marginal",
        strategic_value: "ordinary",
      }
    : matter.id === "northstar-collins-claim"
      ? {
          liability_strength: "strong",
          recovery_source: "confirmed_sufficient",
          evidence_quality: "complete_persuasive",
          damages_documentation: "fully_documented",
          collectability: "strong",
          legal_obstacles: "minor",
          cost_efficiency: "efficient",
          strategic_value: "moderate",
        }
      : {
          liability_strength: "moderate",
          recovery_source: "identified_unconfirmed",
          evidence_quality: "adequate",
          damages_documentation: "partially_documented",
          collectability: "moderate",
          legal_obstacles: "moderate",
          cost_efficiency: "reasonable",
          strategic_value: "ordinary",
        };
  const responses = model.factors.map((factor) => ({
    factorId: factor.id,
    selectedOptionId: factor.options.find((option) => option.value === factorValues[factor.factorKey])?.id ?? factor.options.find((option) => option.value === "unknown")?.id ?? null,
    notes: factor.factorKey === "legal_obstacles" ? "Fictional development assessment note." : "",
  }));
  const financials = {
    potentialRecoverableAmount: matter.id === "harbor-bend-storage-loss" ? matter.amountSought : matter.amountSought,
    estimatedRecoveryProbability: matter.id === "northstar-collins-claim" ? 70 : matter.id === "harbor-bend-storage-loss" ? 35 : 55,
    estimatedLegalCosts: matter.estimatedLegalCost || 1200,
    estimatedThirdPartyReductions: matter.id === "harbor-bend-storage-loss" ? 22000 : 1500,
    amountExplanation: "",
  };
  const calculation = calculateRecoveryAssessment({ model, matter: createAssessmentSnapshot(matter), responses, financials });
  return [{
    id: `${matter.id}-assessment-current`,
    matterId: matter.id,
    assessmentModelId: model.id,
    assessmentModelVersion: model.version,
    status: matter.id === "metro-fleet-rear-end" ? "draft" : "finalized",
    ...financials,
    ...calculation,
    attorneyConclusion: matter.id === "harbor-bend-storage-loss" ? "continue_investigation" : "send_demand_when_complete",
    attorneyConclusionLabel: matter.id === "harbor-bend-storage-loss" ? attorneyConclusionLabels.continue_investigation : attorneyConclusionLabels.send_demand_when_complete,
    assessmentSummary: "Fictional structured assessment for development review.",
    assumptions: "Assumes current carrier and evidence information remains accurate.",
    completedByName: matter.assignedAttorneyName,
    finalizedByName: matter.assignedAttorneyName,
    finalizedAt: matter.id === "metro-fleet-rear-end" ? null : "2026-07-02T14:00:00.000Z",
    supersededAt: null,
    createdAt: "2026-07-02T13:00:00.000Z",
    updatedAt: "2026-07-02T14:00:00.000Z",
    overrideReason: matter.id === "harbor-bend-storage-loss" ? "Coverage is not confirmed, so the attorney conclusion is more cautious than the calculated band." : null,
  }];
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return map;
}

function numberFrom(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number.parseFloat(value) || 0;
}

export function parseCurrency(value: FormDataEntryValue | null) {
  const numeric = Number.parseFloat(String(value ?? "0").replace(/[$,]/g, ""));
  return centsToMoney(moneyToCents(Number.isFinite(numeric) ? numeric : 0));
}
