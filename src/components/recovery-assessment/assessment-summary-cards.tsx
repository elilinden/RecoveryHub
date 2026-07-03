import { CurrencyDisplay } from "@/components/common/currency-display";
import { DetailSummaryCard } from "@/components/matters/detail-summary-card";
import { TriageSeverityBadge } from "@/components/triage/triage-severity-badge";
import type { RecoveryAssessment } from "@/lib/recovery-assessment/types";
import type { TriageFlag } from "@/lib/triage/types";

type AssessmentSummaryCardsProps = {
  assessment: RecoveryAssessment | null;
  primaryUrgency: TriageFlag | null;
};

export function AssessmentSummaryCards({ assessment, primaryUrgency }: AssessmentSummaryCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Recovery assessment outputs">
      <DetailSummaryCard
        label="Recovery viability"
        value={assessment ? `${assessment.viabilityScore} / 100` : "Not assessed"}
        description={assessment?.calculatedRecommendationLabel ?? "Structured assessment not finalized"}
      />
      <DetailSummaryCard
        label="Expected net value"
        value={assessment ? <CurrencyDisplay value={assessment.expectedNetValue} /> : "Not assessed"}
        description={assessment ? `Based on ${assessment.estimatedRecoveryProbability}% attorney-entered probability` : "Probability is not inferred from score"}
      />
      <DetailSummaryCard
        label="Data completeness"
        value={assessment ? `${assessment.dataCompletenessPercentage}%` : "Not assessed"}
        description={assessment?.dataCompletenessLabel ?? "Completeness is separate from outcome confidence"}
      />
      <DetailSummaryCard
        label="Urgency"
        value={primaryUrgency ? <TriageSeverityBadge severity={primaryUrgency.severity} /> : "No current urgency"}
        description={primaryUrgency?.explanation ?? "Uses existing triage flags"}
      />
    </section>
  );
}
