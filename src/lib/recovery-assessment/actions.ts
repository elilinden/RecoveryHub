"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile, type Profile } from "@/lib/data/profiles";
import { loadMatterDetail } from "@/lib/matters-workspace/data";
import { calculateRecoveryAssessment } from "@/lib/recovery-assessment/calculation";
import { loadAssessmentModelForMatter, parseCurrency } from "@/lib/recovery-assessment/data";
import type { AssessmentResponseInput, AttorneyConclusion } from "@/lib/recovery-assessment/types";
import { createAssessmentSnapshot } from "@/lib/recovery-assessment/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type AssessmentActionResult = { ok: true; message: string } | { ok: false; message: string };

const attorneyConclusions = new Set<AttorneyConclusion>([
  "pursue_immediately",
  "continue_investigation",
  "send_demand_when_complete",
  "review_for_arbitration",
  "review_for_litigation",
  "pursue_if_costs_controlled",
  "place_on_hold",
  "recommend_closure",
  "other",
]);

async function getActionProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: "development-profile",
      email: "eli.linden@example.test",
      full_name: "Eli Linden",
      role: "attorney",
      job_title: "Attorney",
      avatar_url: null,
      is_active: true,
    };
  }
  return getCurrentProfile();
}

export async function saveRecoveryAssessmentAction(formData: FormData): Promise<AssessmentActionResult> {
  const profile = await getActionProfile();
  if (!profile || !profile.is_active) return { ok: false, message: "Your session has expired. Please sign in again." };
  if (!canEditAssessment(profile.role)) return { ok: false, message: "You do not have permission to edit recovery assessments." };

  const intent = String(formData.get("intent") ?? "draft");
  const finalizing = intent === "finalize";
  if (finalizing && !canFinalizeAssessment(profile.role)) {
    return { ok: false, message: "Only an attorney, partner, or administrator may finalize recovery assessments." };
  }

  const matterId = String(formData.get("matterId") ?? "");
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const matter = await loadMatterDetail(matterId, profile);
  const model = await loadAssessmentModelForMatter(matter.matterType);
  const responses = model.factors.map((factor): AssessmentResponseInput => ({
    factorId: factor.id,
    selectedOptionId: emptyToNull(String(formData.get(`factor_${factor.id}`) ?? "")),
    notes: String(formData.get(`notes_${factor.id}`) ?? "").trim(),
  }));
  const attorneyConclusion = parseAttorneyConclusion(formData.get("attorneyConclusion"));
  const financials = {
    potentialRecoverableAmount: parseCurrency(formData.get("potentialRecoverableAmount")),
    estimatedRecoveryProbability: clamp(Number.parseFloat(String(formData.get("estimatedRecoveryProbability") ?? "0")) || 0, 0, 100),
    estimatedLegalCosts: parseCurrency(formData.get("estimatedLegalCosts")),
    estimatedThirdPartyReductions: parseCurrency(formData.get("estimatedThirdPartyReductions")),
    amountExplanation: String(formData.get("amountExplanation") ?? "").trim(),
  };
  const calculation = calculateRecoveryAssessment({ model, matter: createAssessmentSnapshot(matter), responses, financials });
  const assessmentSummary = String(formData.get("assessmentSummary") ?? "").trim();
  const assumptions = String(formData.get("assumptions") ?? "").trim();
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();

  if (finalizing) {
    const missingRequired = calculation.factorResults.some((response) => response.isMissing);
    if (missingRequired) return { ok: false, message: "Complete all required assessment factors before finalizing." };
    if ((financials.estimatedRecoveryProbability > 90 || financials.estimatedRecoveryProbability < 10) && !assumptions) {
      return { ok: false, message: "Add assumptions explaining a very high or very low estimated recovery probability." };
    }
    if (financials.potentialRecoverableAmount !== matter.amountSought && !financials.amountExplanation) {
      return { ok: false, message: "Explain why the assessment recoverable amount differs from the matter amount sought." };
    }
    if (calculation.expectedNetValue < 0 && !assumptions) {
      return { ok: false, message: "Add attorney review assumptions before finalizing a negative expected net value." };
    }
    if (attorneyConclusion && requiresOverride(calculation.calculatedRecommendation, attorneyConclusion) && !overrideReason) {
      return { ok: false, message: "Enter an override reason when the attorney conclusion differs from the calculated result." };
    }
  }

  if (!isSupabaseConfigured()) {
    revalidatePath(`/matters/${matterId}`);
    revalidatePath(`/matters/${matterId}/assessment`);
    return { ok: true, message: finalizing ? "Assessment finalized in development mode." : "Assessment draft saved in development mode." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const assessmentValues = {
    matter_id: matterId,
    assessment_model_id: model.id,
    assessment_model_version: model.version,
    status: finalizing ? "finalized" : "draft",
    viability_score: calculation.viabilityScore,
    potential_recoverable_amount: financials.potentialRecoverableAmount,
    estimated_recovery_probability: financials.estimatedRecoveryProbability,
    expected_gross_value: calculation.expectedGrossValue,
    estimated_legal_costs: financials.estimatedLegalCosts,
    estimated_third_party_reductions: financials.estimatedThirdPartyReductions,
    expected_net_value: calculation.expectedNetValue,
    data_completeness_percentage: calculation.dataCompletenessPercentage,
    calculated_recommendation: calculation.calculatedRecommendation,
    attorney_conclusion: attorneyConclusion,
    assessment_summary: assessmentSummary || null,
    assumptions: assumptions || null,
    amount_explanation: financials.amountExplanation || null,
    completed_by: profile.id,
    finalized_by: finalizing ? profile.id : null,
    finalized_at: finalizing ? now : null,
  };

  const query = assessmentId
    ? supabase.from("recovery_assessments").update(assessmentValues).eq("id", assessmentId).select("id").single()
    : supabase.from("recovery_assessments").insert(assessmentValues).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { ok: false, message: "We could not save this recovery assessment." };
  const savedAssessmentId = String((data as { id: string }).id);

  await supabase.from("recovery_assessment_responses").delete().eq("assessment_id", savedAssessmentId);
  await supabase.from("recovery_assessment_responses").insert(calculation.factorResults.map((response) => ({
    assessment_id: savedAssessmentId,
    factor_id: response.factorId,
    selected_option_id: response.selectedOptionId,
    factor_weight_snapshot: response.factorWeightSnapshot,
    score_percentage_snapshot: response.scorePercentageSnapshot,
    points_awarded: response.pointsAwarded,
    is_missing: response.isMissing,
    notes: response.notes || null,
  })));

  if (finalizing) {
    await supabase
      .from("recovery_assessments")
      .update({ status: "superseded", superseded_at: now })
      .eq("matter_id", matterId)
      .eq("status", "finalized")
      .neq("id", savedAssessmentId);
    await supabase.from("matter_events").insert({
      matter_id: matterId,
      event_type: "other",
      occurred_at: now,
      recorded_by: profile.id,
      source: "manual",
      description: "Recovery assessment finalized.",
    });
    await supabase.from("activity_logs").insert({
      matter_id: matterId,
      actor_id: profile.id,
      action_type: "finalize_recovery_assessment",
      entity_type: "recovery_assessment",
      entity_id: savedAssessmentId,
      description: "Recovery assessment finalized.",
      new_value: { viabilityScore: calculation.viabilityScore, expectedNetValue: calculation.expectedNetValue } as Json,
    });
    if (attorneyConclusion && overrideReason) {
      await supabase.from("recovery_assessment_overrides").insert({
        assessment_id: savedAssessmentId,
        calculated_recommendation: calculation.calculatedRecommendation,
        override_recommendation: attorneyConclusion,
        reason: overrideReason,
        created_by: profile.id,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/matters");
  revalidatePath(`/matters/${matterId}`);
  revalidatePath(`/matters/${matterId}/assessment`);
  return { ok: true, message: finalizing ? "Recovery assessment finalized." : "Recovery assessment draft saved." };
}

export async function submitSaveRecoveryAssessmentAction(formData: FormData) {
  await saveRecoveryAssessmentAction(formData);
}

function canEditAssessment(role: Profile["role"]) {
  return ["admin", "partner", "attorney", "staff"].includes(role);
}

function canFinalizeAssessment(role: Profile["role"]) {
  return ["admin", "partner", "attorney"].includes(role);
}

function parseAttorneyConclusion(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  return attorneyConclusions.has(text as AttorneyConclusion) ? text as AttorneyConclusion : null;
}

function requiresOverride(calculated: string, conclusion: AttorneyConclusion) {
  if (calculated === "strong_recovery_candidate" || calculated === "favorable_candidate") {
    return ["continue_investigation", "place_on_hold", "recommend_closure"].includes(conclusion);
  }
  if (calculated === "potentially_uneconomical") return ["pursue_immediately", "send_demand_when_complete"].includes(conclusion);
  return false;
}

function emptyToNull(value: string) {
  return value ? value : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
