import { Card, CardContent } from "@/components/ui/card";
import { validateAssessmentModel } from "@/lib/recovery-assessment/model";
import { loadAssessmentModelForMatter } from "@/lib/recovery-assessment/data";

export async function RecoveryAssessmentSettings() {
  const model = await loadAssessmentModelForMatter("auto_subrogation");
  const validation = validateAssessmentModel(model);

  return (
    <div className="mt-5">
      <Card className="border-border bg-background shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="font-semibold text-foreground">{model.name}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{model.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">{model.notice}</p>
          </div>
          <div className="grid gap-2 text-sm">
            {model.factors.map((factor) => (
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2" key={factor.id}>
                <span className="font-medium text-foreground">{factor.label}</span>
                <span className="text-muted-foreground">{factor.weight} weight</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            Weight total: {validation.totalWeight}. Recommendation bands {validation.bandsValid ? "cover 0-100 without overlap" : "need review"}.
          </div>
          <div className="grid gap-2 text-sm">
            {model.recommendationBands.map((band) => (
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2" key={`${band.minScore}-${band.maxScore}-${band.recommendation}`}>
                <span className="font-medium text-foreground">{band.label}</span>
                <span className="text-muted-foreground">{band.minScore}-{band.maxScore}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            This is the model currently used to score recovery likelihood. Creating or activating a different model version isn&apos;t available in the app yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
