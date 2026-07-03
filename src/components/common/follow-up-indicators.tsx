import { StatusBadge } from "@/components/common/status-badge";
import type { FollowUpReason, MatterStatus } from "@/lib/types";

type FollowUpIndicatorsProps = {
  reasons: FollowUpReason[];
  includeUpcoming?: boolean;
};

const reasonLabels: Record<FollowUpReason, MatterStatus> = {
  overdue_next_action: "Overdue next action",
  missing_next_action: "Missing next action",
  stale_matter: "Stale matter",
  awaiting_overdue_response: "Awaiting overdue response",
  unverified_statute_deadline: "Unverified statute deadline",
  upcoming_deadline: "Upcoming deadline",
};

export function FollowUpIndicators({ reasons, includeUpcoming = false }: FollowUpIndicatorsProps) {
  const visibleReasons = includeUpcoming ? reasons : reasons.filter((reason) => reason !== "upcoming_deadline");

  if (visibleReasons.length === 0) {
    return <StatusBadge status="No immediate action" />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleReasons.map((reason) => (
        <StatusBadge key={reason} status={reasonLabels[reason]} />
      ))}
    </div>
  );
}
