import type {
  MatterListItem,
  MattersListResult,
  MattersQueryState,
  MattersSort,
  WorkspaceSavedView,
} from "@/lib/matters-workspace/types";

export const defaultMattersQuery: MattersQueryState = {
  q: "",
  page: 1,
  pageSize: 25,
  sort: "needs_attention",
  view: "",
  filters: {
    carrier: "",
    adjuster: "",
    matterType: "",
    stage: "",
    priority: "",
    intakeStatus: "",
    jurisdiction: "",
    attorney: "",
    staff: "",
    minAmount: "",
    maxAmount: "",
    amountRecovered: false,
    noAmountSought: false,
    nextAction: "",
    needsAttention: false,
    overdueNextAction: false,
    missingNextAction: false,
    draftIntake: false,
    readyForDemand: false,
    awaitingClient: false,
    closed: false,
    archived: false,
    archivedOnly: false,
    deadlineWindow: "",
    overdueDeadline: false,
    missingStatuteDeadline: false,
    unverifiedDeadline: false,
    staleDays: "",
    customStaleDays: "",
    missingInformation: false,
    missingAdjuster: false,
    missingResponsibleParty: false,
    unknownInsurance: false,
    unknownLiability: false,
    missingPaymentDocumentation: false,
    missingRequiredEvidence: false,
  },
};

export const sortLabels: Record<MattersSort, string> = {
  needs_attention: "Needs attention",
  updated_desc: "Most recently updated",
  updated_asc: "Least recently updated",
  date_referred: "Date referred",
  statute_deadline: "Statute deadline",
  next_action_due: "Next-action due date",
  amount_sought: "Amount sought",
  amount_recovered: "Amount recovered",
  activity_age: "Days since activity",
  matter_name: "Matter name",
  carrier: "Carrier",
  priority: "Priority",
};

const boolKeys = [
  "amountRecovered",
  "noAmountSought",
  "needsAttention",
  "overdueNextAction",
  "missingNextAction",
  "draftIntake",
  "readyForDemand",
  "awaitingClient",
  "closed",
  "archived",
  "archivedOnly",
  "overdueDeadline",
  "missingStatuteDeadline",
  "unverifiedDeadline",
  "missingInformation",
  "missingAdjuster",
  "missingResponsibleParty",
  "unknownInsurance",
  "unknownLiability",
  "missingPaymentDocumentation",
  "missingRequiredEvidence",
] as const;

const stringKeys = [
  "carrier",
  "adjuster",
  "matterType",
  "stage",
  "priority",
  "intakeStatus",
  "jurisdiction",
  "attorney",
  "staff",
  "minAmount",
  "maxAmount",
  "nextAction",
  "deadlineWindow",
  "staleDays",
  "customStaleDays",
] as const;

type MattersQueryOverrides = Omit<Partial<MattersQueryState>, "filters"> & {
  filters?: Partial<MattersQueryState["filters"]>;
};

export function parseMattersQuery(params?: Record<string, string | string[] | undefined> | URLSearchParams): MattersQueryState {
  const read = (key: string) => {
    if (!params) return "";
    if (params instanceof URLSearchParams) return params.get(key) ?? "";
    const value = params[key];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };

  const sort = read("sort") as MattersSort;
  const query: MattersQueryState = {
    ...defaultMattersQuery,
    filters: { ...defaultMattersQuery.filters },
    q: read("q").trim(),
    view: read("view"),
    sort: sort in sortLabels ? sort : defaultMattersQuery.sort,
    page: Math.max(1, Number.parseInt(read("page") || "1", 10) || 1),
    pageSize: [25, 50, 100].includes(Number.parseInt(read("pageSize"), 10))
      ? Number.parseInt(read("pageSize"), 10)
      : defaultMattersQuery.pageSize,
  };

  const filterRecord = query.filters as unknown as Record<string, string | boolean>;
  for (const key of stringKeys) {
    filterRecord[key] = read(key);
  }

  for (const key of boolKeys) {
    filterRecord[key] = read(key) === "1" || read(key) === "true";
  }

  return query;
}

export function createMattersQueryString(query: MattersQueryState, overrides?: MattersQueryOverrides) {
  const merged: MattersQueryState = {
    ...query,
    ...overrides,
    filters: { ...query.filters, ...(overrides?.filters ?? {}) },
  };
  const params = new URLSearchParams();

  if (merged.q) params.set("q", merged.q);
  if (merged.view) params.set("view", merged.view);
  if (merged.sort !== defaultMattersQuery.sort) params.set("sort", merged.sort);
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.pageSize !== defaultMattersQuery.pageSize) params.set("pageSize", String(merged.pageSize));

  for (const key of stringKeys) {
    const value = merged.filters[key];
    if (value) params.set(key, value);
  }

  for (const key of boolKeys) {
    if (merged.filters[key]) params.set(key, "1");
  }

  return params.toString();
}

export function countActiveFilters(query: MattersQueryState) {
  let count = 0;
  for (const key of stringKeys) {
    if (query.filters[key]) count += 1;
  }
  for (const key of boolKeys) {
    if (query.filters[key]) count += 1;
  }
  return count;
}

export function getStaleDayThreshold(query: MattersQueryState) {
  if (query.filters.staleDays === "custom") {
    return Math.max(1, Number.parseInt(query.filters.customStaleDays || "30", 10) || 30);
  }
  return query.filters.staleDays ? Number.parseInt(query.filters.staleDays, 10) : null;
}

export function applySavedView(query: MattersQueryState, views: WorkspaceSavedView[]) {
  if (!query.view) return query;
  const view = views.find((item) => item.id === query.view);
  if (!view) return { ...query, view: "" };
  return {
    ...view.filterConfiguration,
    view: query.view,
    page: query.page,
    pageSize: query.pageSize,
    q: query.q || view.filterConfiguration.q,
  };
}

export function filterMatterItems(items: MatterListItem[], query: MattersQueryState, now = new Date()) {
  const q = query.q.toLowerCase();
  const staleDays = getStaleDayThreshold(query);
  const filtered = items.filter((matter) => {
    if (query.filters.archivedOnly && !matter.isArchived) return false;
    if (!query.filters.archived && !query.filters.archivedOnly && matter.isArchived) return false;
    if (!query.filters.closed && matter.stage === "closed") return false;
    if (query.filters.carrier && matter.carrierName !== query.filters.carrier) return false;
    if (query.filters.adjuster && matter.assignedAdjusterName !== query.filters.adjuster) return false;
    if (query.filters.matterType && matter.matterType !== query.filters.matterType) return false;
    if (query.filters.stage && matter.stage !== query.filters.stage) return false;
    if (query.filters.priority && matter.priority !== query.filters.priority) return false;
    if (query.filters.intakeStatus && matter.intakeStatus !== query.filters.intakeStatus) return false;
    if (query.filters.jurisdiction && matter.jurisdiction !== query.filters.jurisdiction) return false;
    if (query.filters.attorney && matter.assignedAttorneyName !== query.filters.attorney) return false;
    if (query.filters.staff && matter.assignedStaffName !== query.filters.staff) return false;
    if (query.filters.minAmount && matter.amountSought < Number(query.filters.minAmount)) return false;
    if (query.filters.maxAmount && matter.amountSought > Number(query.filters.maxAmount)) return false;
    if (query.filters.amountRecovered && matter.amountRecovered <= 0) return false;
    if (query.filters.noAmountSought && matter.amountSought !== 0) return false;
    if (query.filters.nextAction && matter.nextAction !== query.filters.nextAction) return false;
    if (query.filters.needsAttention && matter.warnings.length === 0 && matter.priority !== "urgent" && matter.priority !== "high") return false;
    if (query.filters.overdueNextAction && !matter.warnings.includes("overdue_next_action")) return false;
    if (query.filters.missingNextAction && !matter.warnings.includes("missing_next_action")) return false;
    if (query.filters.draftIntake && matter.intakeStatus === "complete") return false;
    if (query.filters.readyForDemand && matter.stage !== "ready_for_demand") return false;
    if (query.filters.awaitingClient && !matter.nextAction?.toLowerCase().includes("client")) return false;
    if (query.filters.overdueDeadline && !matter.statuteDeadline) return false;
    if (query.filters.overdueDeadline && daysUntil(matter.statuteDeadline, now) >= 0) return false;
    if (query.filters.missingStatuteDeadline && matter.statuteDeadline) return false;
    if (query.filters.unverifiedDeadline && matter.statuteDeadlineVerified) return false;
    if (query.filters.deadlineWindow && (!matter.statuteDeadline || daysUntil(matter.statuteDeadline, now) > Number(query.filters.deadlineWindow))) return false;
    if (staleDays !== null && (matter.daysSinceLastSubstantiveActivity ?? 0) < staleDays) return false;
    if (query.filters.missingInformation && !matter.warnings.includes("missing_information") && !matter.warnings.includes("missing_required_evidence")) return false;
    if (query.filters.missingAdjuster && matter.assignedAdjusterName) return false;
    if (query.filters.missingResponsibleParty && matter.primaryPartyNames.length > 0) return false;
    if (query.filters.unknownInsurance && matter.insuranceStatus !== "unknown") return false;
    if (query.filters.unknownLiability && matter.liabilityAssessment !== "unknown") return false;
    if (query.filters.missingPaymentDocumentation && !matter.warnings.includes("missing_required_evidence")) return false;
    if (query.filters.missingRequiredEvidence && !matter.warnings.includes("missing_required_evidence")) return false;
    if (!q) return true;

    return [
      matter.matterName,
      matter.carrierName,
      matter.carrierClaimNumber,
      matter.firmMatterNumber,
      matter.assignedAdjusterName,
      matter.assignedAttorneyName,
      matter.assignedStaffName,
      matter.primaryPartyNames.join(" "),
      matter.nextAction,
    ].some((value) => value?.toLowerCase().includes(q));
  });

  return sortMatterItems(filtered, query.sort);
}

export function paginateMatterItems(items: MatterListItem[], query: MattersQueryState): MattersListResult {
  const totalCount = items.length;
  const start = (query.page - 1) * query.pageSize;
  const pageItems = items.slice(start, start + query.pageSize);
  return {
    items: pageItems,
    totalCount,
    rangeStart: totalCount === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + query.pageSize, totalCount),
    query,
  };
}

export function sortMatterItems(items: MatterListItem[], sort: MattersSort) {
  const priorityWeight = { urgent: 0, high: 1, normal: 2, low: 3 };
  const needsAttentionWeight = (matter: MatterListItem) => {
    if (matter.warnings.includes("overdue_next_action")) return 0;
    if (matter.warnings.includes("deadline_within_30")) return 1;
    if (matter.priority === "urgent") return 2;
    if (matter.priority === "high") return 3;
    if (matter.warnings.length > 0) return 4;
    return 5;
  };

  return [...items].sort((a, b) => {
    if (sort === "needs_attention") return needsAttentionWeight(a) - needsAttentionWeight(b) || b.lastUpdated.localeCompare(a.lastUpdated);
    if (sort === "updated_asc") return a.lastUpdated.localeCompare(b.lastUpdated) || a.id.localeCompare(b.id);
    if (sort === "updated_desc") return b.lastUpdated.localeCompare(a.lastUpdated) || a.id.localeCompare(b.id);
    if (sort === "statute_deadline") return (a.statuteDeadline ?? "9999").localeCompare(b.statuteDeadline ?? "9999") || a.id.localeCompare(b.id);
    if (sort === "next_action_due") return (a.nextActionDueDate ?? "9999").localeCompare(b.nextActionDueDate ?? "9999") || a.id.localeCompare(b.id);
    if (sort === "amount_sought") return b.amountSought - a.amountSought || a.id.localeCompare(b.id);
    if (sort === "amount_recovered") return b.amountRecovered - a.amountRecovered || a.id.localeCompare(b.id);
    if (sort === "activity_age") return (b.daysSinceLastSubstantiveActivity ?? -1) - (a.daysSinceLastSubstantiveActivity ?? -1) || a.id.localeCompare(b.id);
    if (sort === "matter_name") return a.matterName.localeCompare(b.matterName) || a.id.localeCompare(b.id);
    if (sort === "carrier") return a.carrierName.localeCompare(b.carrierName) || a.id.localeCompare(b.id);
    if (sort === "priority") return priorityWeight[a.priority] - priorityWeight[b.priority] || a.id.localeCompare(b.id);
    return b.lastUpdated.localeCompare(a.lastUpdated) || a.id.localeCompare(b.id);
  });
}

function daysUntil(date: string | null, from: Date) {
  if (!date) return Number.POSITIVE_INFINITY;
  const target = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const basis = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  return Math.ceil((target.getTime() - basis.getTime()) / 86_400_000);
}
