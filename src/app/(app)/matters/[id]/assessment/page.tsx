import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Save } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { AssessmentSummaryCards } from "@/components/recovery-assessment/assessment-summary-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireActiveProfile } from "@/lib/auth/session";
import { loadActiveMatterFlags, loadTriageSettings } from "@/lib/triage/data";
import { evaluateMatterTriage, getPrimaryTriageFlag, isSnoozed } from "@/lib/triage/rules";
import { createSnapshotFromDetail } from "@/lib/triage/types";
import { calculateRecoveryAssessment } from "@/lib/recovery-assessment/calculation";
import { loadMatterForAssessment, buildBlankResponseInputs, defaultFinancials } from "@/lib/recovery-assessment/data";
import { attorneyConclusionLabels } from "@/lib/recovery-assessment/model";
import { submitSaveRecoveryAssessmentAction } from "@/lib/recovery-assessment/actions";

type AssessmentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecoveryAssessmentPage({ params }: AssessmentPageProps) {
  const { id } = await params;
  const session = await requireActiveProfile();
  const { matter, bundle } = await loadMatterForAssessment(id, session.profile);
  const { settings } = await loadTriageSettings(session.profile);
  const computedFlags = evaluateMatterTriage(createSnapshotFromDetail(matter), settings).flags;
  const storedFlags = (await loadActiveMatterFlags([matter.id])).get(matter.id) ?? [];
  const storedByRule = new Map(storedFlags.map((flag) => [flag.ruleKey, flag]));
  const activeFlags = computedFlags.map((flag) => {
    const stored = storedByRule.get(flag.ruleKey);
    return stored ? { ...flag, id: stored.id, detectedAt: stored.detectedAt, dismissedUntil: stored.dismissedUntil } : flag;
  }).filter((flag) => !isSnoozed(flag));
  const primaryUrgency = getPrimaryTriageFlag(activeFlags);
  const workingAssessment = bundle.draft ?? bundle.current;
  const responseInputs = workingAssessment
    ? workingAssessment.factorResults.map((response) => ({ factorId: response.factorId, selectedOptionId: response.selectedOptionId, notes: response.notes }))
    : buildBlankResponseInputs(bundle.model);
  const responseByFactor = new Map(responseInputs.map((response) => [response.factorId, response]));
  const financials = workingAssessment
    ? {
        potentialRecoverableAmount: workingAssessment.potentialRecoverableAmount,
        estimatedRecoveryProbability: workingAssessment.estimatedRecoveryProbability,
        estimatedLegalCosts: workingAssessment.estimatedLegalCosts,
        estimatedThirdPartyReductions: workingAssessment.estimatedThirdPartyReductions,
        amountExplanation: workingAssessment.amountExplanation,
      }
    : defaultFinancials(matter);
  const preview = calculateRecoveryAssessment({
    model: bundle.model,
    matter: {
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
      activeTriageFlags: activeFlags,
    },
    responses: responseInputs,
    financials,
  });
  const canFinalize = ["admin", "partner", "attorney"].includes(session.profile.role);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button asChild className="h-10 gap-2" variant="outline">
              <Link href={`/matters/${matter.id}`}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Back to Matter
              </Link>
            </Button>
          </>
        }
        subtitle={`${matter.carrierName} · Structured Recovery Assessment`}
        title="Recovery Assessment"
      />

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-5">
          <p className="text-sm leading-6 text-muted-foreground">
            This module uses configured factors and attorney-entered assumptions. It is not predictive AI, a legal conclusion, or an automatic matter decision.
          </p>
        </CardContent>
      </Card>

      <AssessmentSummaryCards assessment={workingAssessment ?? {
        id: "preview",
        matterId: matter.id,
        assessmentModelId: bundle.model.id,
        assessmentModelVersion: bundle.model.version,
        status: "draft",
        ...financials,
        ...preview,
        attorneyConclusion: null,
        attorneyConclusionLabel: null,
        assessmentSummary: null,
        assumptions: null,
        completedByName: null,
        finalizedByName: null,
        finalizedAt: null,
        supersededAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        overrideReason: null,
      }} primaryUrgency={primaryUrgency} />

      <form action={submitSaveRecoveryAssessmentAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <input name="matterId" type="hidden" value={matter.id} />
        <input name="assessmentId" type="hidden" value={workingAssessment?.id ?? ""} />
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <SectionHeader
                description={`${bundle.model.name} v${bundle.model.version}. ${bundle.model.notice}`}
                title="Complete Factors"
              />
              <div className="grid gap-4">
                {bundle.model.factors.map((factor) => {
                  const selected = responseByFactor.get(factor.id)?.selectedOptionId ?? "";
                  return (
                    <fieldset className="rounded-lg border border-border bg-background p-4" key={factor.id}>
                      <legend className="font-semibold text-foreground">{factor.label}</legend>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{factor.helpText}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {factor.options.map((option) => (
                          <label className="flex gap-3 rounded-lg border border-border bg-card p-3 text-sm" key={option.id}>
                            <input defaultChecked={selected === option.id} name={`factor_${factor.id}`} type="radio" value={option.id} />
                            <span>
                              <span className="block font-medium text-foreground">{option.label}</span>
                              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                {option.scorePercentage === null ? "Unknown: no awarded points and reduced completeness" : `${factor.weight} x ${option.scorePercentage}% = ${((factor.weight * option.scorePercentage) / 100).toFixed(1)} points`}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <label className="mt-3 block space-y-1 text-sm font-medium text-foreground">
                        <span>Notes</span>
                        <textarea className="min-h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" defaultValue={responseByFactor.get(factor.id)?.notes ?? ""} name={`notes_${factor.id}`} />
                      </label>
                    </fieldset>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <SectionHeader description="Expected value uses attorney-entered probability. It is not inferred from Viability Score." title="Review Financial Assumptions" />
              <div className="grid gap-3 sm:grid-cols-2">
                <MoneyField label="Potential recoverable amount" name="potentialRecoverableAmount" value={financials.potentialRecoverableAmount} />
                <NumberField label="Estimated recovery probability (%)" name="estimatedRecoveryProbability" value={financials.estimatedRecoveryProbability} />
                <MoneyField label="Estimated legal costs" name="estimatedLegalCosts" value={financials.estimatedLegalCosts} />
                <MoneyField label="Third-party reductions" name="estimatedThirdPartyReductions" value={financials.estimatedThirdPartyReductions} />
              </div>
              {financials.potentialRecoverableAmount !== matter.amountSought ? (
                <p className="text-sm text-[var(--warning)]">
                  Matter amount sought is <CurrencyDisplay value={matter.amountSought} />. Explain why the assessment amount differs.
                </p>
              ) : null}
              <label className="block space-y-1 text-sm font-medium text-foreground">
                <span>Amount explanation</span>
                <textarea className="min-h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" defaultValue={financials.amountExplanation} name="amountExplanation" />
              </label>
              <label className="block space-y-1 text-sm font-medium text-foreground">
                <span>Assumptions</span>
                <textarea className="min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" defaultValue={workingAssessment?.assumptions ?? ""} name="assumptions" />
              </label>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <SectionHeader title="Review and Finalize" />
              <label className="block space-y-1 text-sm font-medium text-foreground">
                <span>Attorney conclusion</span>
                <select className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" defaultValue={workingAssessment?.attorneyConclusion ?? ""} name="attorneyConclusion">
                  <option value="">Select conclusion</option>
                  {Object.entries(attorneyConclusionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium text-foreground">
                <span>Assessment summary</span>
                <textarea className="min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" defaultValue={workingAssessment?.assessmentSummary ?? ""} name="assessmentSummary" />
              </label>
              <label className="block space-y-1 text-sm font-medium text-foreground">
                <span>Override reason</span>
                <textarea className="min-h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" defaultValue={workingAssessment?.overrideReason ?? ""} name="overrideReason" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button className="gap-2" name="intent" type="submit" value="draft" variant="outline">
                  <Save aria-hidden="true" className="size-4" />
                  Save Draft
                </Button>
                {canFinalize ? <Button name="intent" type="submit" value="finalize">Finalize Assessment</Button> : <p className="text-sm text-muted-foreground">Staff may assist with drafts, but only attorneys, partners, or administrators may finalize.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <SectionHeader title="Calculation Preview" />
              <Formula label="Viability Score" value={`${preview.viabilityScore} / 100`} description={preview.calculatedRecommendationLabel} />
              <Formula label="Expected Gross Value" value={<CurrencyDisplay value={preview.expectedGrossValue} />} description={`${financials.potentialRecoverableAmount.toLocaleString()} x ${financials.estimatedRecoveryProbability}%`} />
              <Formula label="Expected Net Value" value={<CurrencyDisplay value={preview.expectedNetValue} />} description={preview.formula.expectedNetValueFormula} />
              <Formula label="Data Completeness" value={`${preview.dataCompletenessPercentage}%`} description={preview.dataCompletenessLabel} />
              {preview.warnings.length > 0 ? (
                <div className="rounded-lg border border-[color:var(--warning)]/20 bg-[var(--warning-muted)] p-3">
                  {preview.warnings.map((warning) => <p className="text-sm text-[var(--warning)]" key={warning}>{warning}</p>)}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-3 p-5">
              <SectionHeader title="Assessment History" />
              {bundle.history.length === 0 ? <p className="text-sm text-muted-foreground">No prior assessments. Historical versions will appear after reassessment.</p> : bundle.history.map((assessment) => (
                <div className="rounded-lg border border-border bg-background p-3 text-sm" key={assessment.id}>
                  <p className="font-medium text-foreground">{assessment.status === "draft" ? "Draft assessment" : assessment.calculatedRecommendationLabel}</p>
                  <p className="mt-1 text-muted-foreground">
                    {assessment.finalizedAt ? <DateDisplay value={assessment.finalizedAt.slice(0, 10)} /> : "In progress"} · {assessment.viabilityScore}/100 · <CurrencyDisplay value={assessment.expectedNetValue} />
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}

function MoneyField({ label, name, value }: { label: string; name: string; value: number }) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" defaultValue={value.toFixed(2)} inputMode="decimal" name={name} />
    </label>
  );
}

function NumberField({ label, name, value }: { label: string; name: string; value: number }) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" defaultValue={String(value)} max={100} min={0} name={name} type="number" />
    </label>
  );
}

function Formula({ label, value, description }: { label: string; value: ReactNode; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
