import { RotateCw } from "lucide-react";

import { DateDisplay } from "@/components/common/date-display";
import { SectionHeader } from "@/components/common/section-header";
import { TriageSeverityBadge } from "@/components/triage/triage-severity-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Profile } from "@/lib/data/profiles";
import {
  submitOverrideTriageFlagAction,
  submitRecheckMatterTriageAction,
  submitSnoozeTriageFlagAction,
} from "@/lib/triage/actions";
import { canOverrideFlags, canSnoozeFlags } from "@/lib/triage/data";
import type { TriageFlag } from "@/lib/triage/types";

type MatterTriagePanelProps = {
  matterId: string;
  activeFlags: TriageFlag[];
  resolvedFlags: TriageFlag[];
  profile: Profile;
};

export function MatterTriagePanel({ matterId, activeFlags, resolvedFlags, profile }: MatterTriagePanelProps) {
  return (
    <Card className="border-border bg-card shadow-sm" id="attention">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            description="Automatic checks for this matter. Always confirm legal decisions yourself before acting."
            title="Attention"
          />
          <form action={submitRecheckMatterTriageAction}>
            <input name="matterId" type="hidden" value={matterId} />
            <Button className="h-10 gap-2" type="submit" variant="outline">
              <RotateCw aria-hidden="true" className="size-4" />
              Recheck Matter
            </Button>
          </form>
        </div>

        {activeFlags.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-5 py-8 text-center">
            <h3 className="text-lg font-semibold text-foreground">No current triage issues</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              The current rule set did not identify overdue actions, urgent deadlines, stale activity, or material information gaps.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {activeFlags.map((flag) => (
              <div className="rounded-lg border border-border bg-background p-4" key={`${flag.ruleKey}-${flag.id ?? flag.matterId}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{flag.title}</h3>
                      <TriageSeverityBadge severity={flag.severity} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{flag.explanation}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{flag.suggestedAction}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {flag.relevantDate ? <DateDisplay prefix="Relevant date" value={flag.relevantDate} /> : "No date set"}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span>{flag.isLegalWarning ? "Legal warning" : "Reminder"}</span>
                  <span>{flag.canSnooze ? "May be snoozed" : "Snooze restricted"}</span>
                  <span>{flag.canOverride ? "Documented override available" : "Override unavailable"}</span>
                  {flag.dismissedUntil ? <span>Snoozed until {flag.dismissedUntil.slice(0, 10)}</span> : null}
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {flag.id && flag.canSnooze && canSnoozeFlags(profile.role) && !flag.isLegalWarning ? (
                    <form action={submitSnoozeTriageFlagAction} className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_140px_auto]">
                      <input name="flagId" type="hidden" value={flag.id} />
                      <input name="matterId" type="hidden" value={matterId} />
                      <label className="space-y-1 text-xs font-medium text-foreground">
                        <span>Snooze reason</span>
                        <input className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" name="reason" placeholder="Waiting on scheduled follow-up" />
                      </label>
                      <label className="space-y-1 text-xs font-medium text-foreground">
                        <span>Until</span>
                        <input className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" name="dismissedUntil" type="date" />
                      </label>
                      <Button className="self-end" size="sm" type="submit" variant="outline">Snooze</Button>
                    </form>
                  ) : null}
                  {flag.id && flag.canOverride && canOverrideFlags(profile.role) ? (
                    <form action={submitOverrideTriageFlagAction} className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_140px_auto]">
                      <input name="flagId" type="hidden" value={flag.id} />
                      <input name="matterId" type="hidden" value={matterId} />
                      <input name="ruleKey" type="hidden" value={flag.ruleKey} />
                      <label className="space-y-1 text-xs font-medium text-foreground">
                        <span>Override reason</span>
                        <input className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" name="reason" placeholder="Documented attorney reason" />
                      </label>
                      <label className="space-y-1 text-xs font-medium text-foreground">
                        <span>Expires</span>
                        <input className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" name="expiresAt" type="date" />
                      </label>
                      <Button className="self-end" size="sm" type="submit" variant="outline">Override</Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {resolvedFlags.length > 0 ? (
          <details className="rounded-lg border border-border bg-background p-4">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">Recently resolved flags</summary>
            <div className="mt-3 grid gap-2">
              {resolvedFlags.map((flag) => (
                <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={`${flag.ruleKey}-${flag.resolvedAt}`}>
                  <span className="font-medium text-foreground">{flag.title}</span>
                  <span className="text-muted-foreground">{flag.resolutionReason ?? "Resolved after re-evaluation"}</span>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
