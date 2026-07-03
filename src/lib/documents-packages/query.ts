import type { PackageSort, PackageWorkspaceQuery } from "@/lib/documents-packages/types";

export const defaultPackageQuery: PackageWorkspaceQuery = {
  q: "",
  status: "",
  packageType: "",
  verification: "",
  view: "",
  sort: "awaiting_review",
  page: 1,
  pageSize: 25,
};

export const packageViews = [
  { id: "my-drafts", name: "My Drafts", description: "Draft packages assigned to the current preparer." },
  { id: "needs-validation", name: "Needs Validation", description: "Packages with required validation work remaining." },
  { id: "ready-for-review", name: "Ready for Review", description: "Submitted packages waiting on review." },
  { id: "changes-requested", name: "Changes Requested", description: "Packages returned for correction." },
  { id: "approved-for-send", name: "Approved for Send", description: "Approved packages ready for the later send workflow." },
  { id: "unverified-recipients", name: "Unverified Recipients", description: "Packages where recipient email verification remains open." },
  { id: "missing-attachments", name: "Missing Attachments", description: "Packages missing required supporting documents." },
  { id: "upcoming-deadlines", name: "Upcoming Response Deadlines", description: "Packages ordered by nearest response deadline." },
] as const;

const sortValues: PackageSort[] = ["awaiting_review", "response_deadline", "updated_desc", "amount_demanded", "carrier", "package_type"];

export function parsePackageQuery(params?: Record<string, string | string[] | undefined> | URLSearchParams): PackageWorkspaceQuery {
  const read = (key: string) => {
    if (!params) return "";
    if (params instanceof URLSearchParams) return params.get(key) ?? "";
    const value = params[key];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };
  const sort = read("sort") as PackageSort;
  return {
    q: read("q").trim(),
    status: read("status"),
    packageType: read("packageType"),
    verification: read("verification"),
    view: read("view"),
    sort: sortValues.includes(sort) ? sort : defaultPackageQuery.sort,
    page: Math.max(1, Number.parseInt(read("page") || "1", 10) || 1),
    pageSize: [25, 50, 100].includes(Number.parseInt(read("pageSize"), 10)) ? Number.parseInt(read("pageSize"), 10) : defaultPackageQuery.pageSize,
  };
}

export function createPackageQueryString(query: PackageWorkspaceQuery, overrides?: Partial<PackageWorkspaceQuery>) {
  const merged = { ...query, ...(overrides ?? {}) };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.status) params.set("status", merged.status);
  if (merged.packageType) params.set("packageType", merged.packageType);
  if (merged.verification) params.set("verification", merged.verification);
  if (merged.view) params.set("view", merged.view);
  if (merged.sort !== defaultPackageQuery.sort) params.set("sort", merged.sort);
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.pageSize !== defaultPackageQuery.pageSize) params.set("pageSize", String(merged.pageSize));
  return params.toString();
}

export function countActivePackageFilters(query: PackageWorkspaceQuery) {
  return [query.q, query.status, query.packageType, query.verification, query.view].filter(Boolean).length;
}
