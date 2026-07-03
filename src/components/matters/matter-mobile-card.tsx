import Link from "next/link";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { FollowUpIndicators } from "@/components/common/follow-up-indicators";
import { PriorityBadge } from "@/components/common/priority-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Matter } from "@/lib/types";

type MatterMobileCardProps = {
  matter: Matter;
};

export function MatterMobileCard({ matter }: MatterMobileCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <Link className="block focus-visible:rounded-md" href={`/matters/${matter.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">{matter.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {matter.carrier} · {matter.claimNumber}
              </p>
            </div>
            <CurrencyDisplay className="shrink-0 text-sm font-semibold text-foreground" value={matter.amountSought} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={matter.stage} />
            <PriorityBadge priority={matter.priority} />
            {!matter.deadlineVerified ? <StatusBadge status="Unverified statute deadline" /> : null}
          </div>
          <div className="mt-3">
            <FollowUpIndicators reasons={matter.followUpReasons} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Adjuster</dt>
              <dd className="mt-1 font-medium text-foreground">{matter.assignedAdjuster}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Next action</dt>
              <dd className="mt-1 font-medium text-foreground">{matter.nextAction ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Next-action due</dt>
              <dd className="mt-1 font-medium text-foreground">
                {matter.nextActionDueDate ? <DateDisplay value={matter.nextActionDueDate} /> : "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Statute deadline</dt>
              <dd className="mt-1 font-medium text-foreground">
                <DateDisplay value={matter.statuteDeadline} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Assigned</dt>
              <dd className="mt-1 font-medium text-foreground">{matter.assignedAttorney}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Activity age</dt>
              <dd className="mt-1 font-medium text-foreground">{matter.daysSinceLastSubstantiveActivity} days</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd className="mt-1 font-medium text-foreground">
                <DateDisplay value={matter.lastUpdated} />
              </dd>
            </div>
          </dl>
        </Link>
      </CardContent>
    </Card>
  );
}
