import { Card, CardContent } from "@/components/ui/card";
import { initialGeneralSubrogationModel, validateAssessmentModel } from "@/lib/recovery-assessment/model";
import type { Profile } from "@/lib/data/profiles";

type RecoveryAssessmentSettingsProps = {
  profile: Profile;
};

export function RecoveryAssessmentSettings({ profile }: RecoveryAssessmentSettingsProps) {
  const validation = validateAssessmentModel(initialGeneralSubrogationModel);
  const canManage = profile.role === "admin" || profile.role === "partner";

  return (
    <div className="mt-5">
      <Card className="border-border bg-background shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="font-semibold text-foreground">{initialGeneralSubrogationModel.name}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{initialGeneralSubrogationModel.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">{initialGeneralSubrogationModel.notice}</p>
          </div>
          <div className="grid gap-2 text-sm">
            {initialGeneralSubrogationModel.factors.map((factor) => (
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2" key={factor.id}>
                <span className="font-medium text-foreground">{factor.label}</span>
                <span className="text-muted-foreground">{factor.weight} weight</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
            Weight total: {validation.totalWeight}. Recommendation bands {validation.bandsValid ? "cover 0-100 without overlap" : "need review"}.
          </div>
          {!canManage ? <p className="text-sm text-muted-foreground">Only partners and administrators may create or activate model versions.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
