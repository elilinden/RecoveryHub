import { Button } from "@/components/ui/button";
import { submitUpdateTriageSettingsAction } from "@/lib/triage/actions";
import { triageSettingDefinitions } from "@/lib/triage/settings";
import type { TriageSettingsResult } from "@/lib/triage/data";
import type { TriageSettings } from "@/lib/triage/types";

type TriageSettingsFormProps = {
  result: TriageSettingsResult;
};

export function TriageSettingsForm({ result }: TriageSettingsFormProps) {
  const settings = result.settings;

  return (
    <div className="mt-5">
      <form action={submitUpdateTriageSettingsAction} className="grid gap-4 rounded-lg border border-border bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {triageSettingDefinitions.map((definition) => {
            const name = settingName(definition.key);
            const value = settings[name];
            if (definition.inputType === "boolean") {
              return (
                <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm" key={definition.key}>
                  <input
                    className="mt-1"
                    defaultChecked={Boolean(value)}
                    disabled={!result.canManage}
                    name={name}
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-medium text-foreground">{definition.label}</span>
                    <span className="mt-1 block leading-5 text-muted-foreground">{definition.description}</span>
                  </span>
                </label>
              );
            }

            return (
              <label className="space-y-1 text-sm font-medium text-foreground" key={definition.key}>
                <span>{definition.label}</span>
                <input
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm disabled:opacity-70"
                  defaultValue={String(value)}
                  disabled={!result.canManage}
                  min={1}
                  name={name}
                  type="number"
                />
                <span className="block text-xs font-normal leading-5 text-muted-foreground">{definition.description}</span>
              </label>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {result.updatedAt ? `Last updated ${new Date(result.updatedAt).toLocaleString()}` : "Using default triage settings."}
          </p>
          {result.canManage ? <Button type="submit">Save Triage Settings</Button> : <p className="text-sm text-muted-foreground">Only partners and administrators may change these settings.</p>}
        </div>
      </form>
    </div>
  );
}

function settingName(key: string): keyof TriageSettings {
  const names: Record<string, keyof TriageSettings> = {
    urgent_statute_days: "urgentStatuteDays",
    upcoming_statute_days: "upcomingStatuteDays",
    stale_matter_days: "staleMatterDays",
    overdue_response_days: "overdueResponseDays",
    new_referral_review_days: "newReferralReviewDays",
    demand_follow_up_days: "demandFollowUpDays",
    missing_next_action_is_flagged: "missingNextActionIsFlagged",
    unverified_deadline_is_flagged: "unverifiedDeadlineIsFlagged",
  };
  return names[key] ?? "urgentStatuteDays";
}
