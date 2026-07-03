import Link from "next/link";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusBadgeList } from "@/components/common/status-badge-list";
import { Card, CardContent } from "@/components/ui/card";
import {
  intakeStatusLabels,
  matterStageLabels,
  priorityLabels,
  warningLabels,
} from "@/lib/matters-workspace/labels";
import type { MatterListItem, MatterWarning } from "@/lib/matters-workspace/types";
import type { MatterStatus } from "@/lib/types";

type MatterWorkspaceCardProps = {
  matter: MatterListItem;
};

const warningStatus: Partial<Record<MatterWarning, MatterStatus>> = {
  overdue_next_action: "Action overdue",
  deadline_within_30: "Deadline soon",
  unverified_statute_deadline: "Unverified statute deadline",
  missing_next_action: "No next action",
  stale_matter: "Stale matter",
  draft_intake: "Draft intake",
  missing_information: "Missing information",
  missing_required_evidence: "Missing information",
};

const warningDescriptions: Partial<Record<MatterWarning, string>> = {
  overdue_next_action: "Overdue next action",
  deadline_within_30: "Upcoming deadline",
  unverified_statute_deadline: "Unverified statute deadline",
  missing_next_action: "Missing next action",
  stale_matter: "Stale matter",
  draft_intake: "Draft intake",
  missing_information: "Missing information",
  missing_required_evidence: "Missing required evidence",
};

export function MatterWorkspaceCard({ matter }: MatterWorkspaceCardProps) {
  const href = matter.intakeStatus === "complete" ? `/matters/${matter.id}` : `/matters/${matter.id}/intake`;
  const primaryWarning = matter.warnings[0];

  return (
    <Card className="min-w-0 border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <Link className="block focus-visible:rounded-md" href={href}>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground" title={matter.matterName}>
                {matter.matterName}
              </h3>
              <p className="mt-1 truncate text-sm text-muted-foreground" title={`${matter.carrierName} · ${matter.carrierClaimNumber ?? "No claim number"}`}>
                {matter.carrierName} · {matter.carrierClaimNumber ?? "No claim number"}
              </p>
            </div>
            <CurrencyDisplay className="shrink-0 text-sm font-semibold text-foreground" value={matter.amountSought} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge status={matterStageLabels[matter.stage] as MatterStatus} />
            <StatusBadge status={priorityLabels[matter.priority] as MatterStatus} />
            {matter.intakeStatus !== "complete" ? (
              <>
                <StatusBadge status={intakeStatusLabels[matter.intakeStatus] as MatterStatus} />
                <span className="inline-flex h-6 items-center rounded-full bg-primary px-2.5 text-[13px] font-semibold text-primary-foreground">
                  Resume Intake →
                </span>
              </>
            ) : null}
          </div>
          {primaryWarning ? (
            <p className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              <span className="font-medium">Primary issue:</span> {warningLabels[primaryWarning]}
            </p>
          ) : null}
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-muted-foreground">Next action</dt>
              <dd className="mt-1 truncate font-medium text-foreground" title={matter.nextAction ?? "Not assigned"}>
                {matter.nextAction ?? "Not assigned"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Next-action due</dt>
              <dd className="mt-1 font-medium text-foreground">
                {matter.nextActionDueDate ? <DateDisplay value={matter.nextActionDueDate} /> : "Not set"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Assigned user</dt>
              <dd className="mt-1 truncate font-medium text-foreground" title={matter.assignedFirmUser}>
                {matter.assignedFirmUser}
              </dd>
            </div>
          </dl>
        </Link>
      </CardContent>
    </Card>
  );
}

export function MatterWarnings({ warnings, max = 3 }: { warnings: MatterWarning[]; max?: number }) {
  if (warnings.length === 0) return <StatusBadge status="No immediate action" />;

  return (
    <StatusBadgeList
      items={warnings.map((warning) => ({
        key: warning,
        node: (
          <StatusBadge
            ariaLabel={warningDescriptions[warning]}
            status={warningStatus[warning] ?? "Missing information"}
            title={warningDescriptions[warning]}
          />
        ),
      }))}
      max={max}
    />
  );
}
