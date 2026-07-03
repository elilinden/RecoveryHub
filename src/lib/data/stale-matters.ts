import type { Matter } from "@/lib/types";

export type FollowUpBuckets = {
  overdueNextActions: Matter[];
  missingNextActions: Matter[];
  staleMatters: Matter[];
  unverifiedStatuteDeadlines: Matter[];
  awaitingOverdueResponse: Matter[];
};

export function getFollowUpBuckets(matters: Matter[]): FollowUpBuckets {
  return {
    overdueNextActions: matters.filter((matter) => matter.followUpReasons.includes("overdue_next_action")),
    missingNextActions: matters.filter((matter) => matter.followUpReasons.includes("missing_next_action")),
    staleMatters: matters.filter((matter) => matter.followUpReasons.includes("stale_matter")),
    unverifiedStatuteDeadlines: matters.filter((matter) =>
      matter.followUpReasons.includes("unverified_statute_deadline")
    ),
    awaitingOverdueResponse: matters.filter((matter) =>
      matter.followUpReasons.includes("awaiting_overdue_response")
    ),
  };
}
