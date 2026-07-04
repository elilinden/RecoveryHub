import { createMattersQueryString, defaultMattersQuery } from "@/lib/matters-workspace/query";
import type { MattersQueryState } from "@/lib/matters-workspace/types";

type MattersHrefOverrides = Omit<Partial<MattersQueryState>, "filters"> & {
  filters?: Partial<MattersQueryState["filters"]>;
};

export function mattersHref(overrides?: MattersHrefOverrides) {
  const queryString = createMattersQueryString(defaultMattersQuery, { ...overrides, page: 1, view: "" });
  return queryString ? `/matters?${queryString}` : "/matters";
}

export const dashboardMatterLinks = {
  urgent: mattersHref({ filters: { needsAttention: true } }),
  tasks: mattersHref({ sort: "next_action_due" }),
  deadlines: mattersHref({ sort: "statute_deadline", filters: { deadlineWindow: "30" } }),
  readyForDemand: mattersHref({ filters: { readyForDemand: true } }),
  followUp: mattersHref({ sort: "next_action_due", filters: { needsAttention: true } }),
  missingInformation: mattersHref({ filters: { missingInformation: true } }),
  newReferrals: mattersHref({ filters: { stage: "new_referral" } }),
};
