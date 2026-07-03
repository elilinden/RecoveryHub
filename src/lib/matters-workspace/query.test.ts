import { describe, expect, it } from "vitest";

import { getDevelopmentMatterDetail, developmentMatterItems, systemSavedViews } from "./mock";
import {
  applySavedView,
  countActiveFilters,
  filterMatterItems,
  paginateMatterItems,
  parseMattersQuery,
} from "./query";

describe("matters workspace query", () => {
  it("parses search, filters, sorting, and pagination from URL state", () => {
    const query = parseMattersQuery(new URLSearchParams("q=northstar&stage=ready_for_demand&overdueNextAction=1&page=2&pageSize=50&sort=amount_sought"));

    expect(query.q).toBe("northstar");
    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(50);
    expect(query.sort).toBe("amount_sought");
    expect(query.filters.stage).toBe("ready_for_demand");
    expect(query.filters.overdueNextAction).toBe(true);
    expect(countActiveFilters(query)).toBe(2);
  });

  it("filters by search and carrier without leaking unrelated development matters", () => {
    const query = parseMattersQuery(new URLSearchParams("q=collins&carrier=Northstar%20Mutual"));
    const results = filterMatterItems(developmentMatterItems, query, new Date("2026-07-03T12:00:00.000Z"));

    expect(results).toHaveLength(1);
    expect(results[0].matterName).toContain("Collins");
  });

  it("supports stale-matter and deadline filters", () => {
    const query = parseMattersQuery(new URLSearchParams("staleDays=30&deadlineWindow=30"));
    const results = filterMatterItems(developmentMatterItems, query, new Date("2026-07-03T12:00:00.000Z"));

    expect(results.every((matter) => (matter.daysSinceLastSubstantiveActivity ?? 0) >= 30)).toBe(true);
    expect(results.every((matter) => matter.statuteDeadline !== null)).toBe(true);
  });

  it("paginates without loading every result into the rendered page", () => {
    const query = parseMattersQuery(new URLSearchParams("page=2&pageSize=25"));
    const result = paginateMatterItems(Array.from({ length: 60 }, (_, index) => ({ ...developmentMatterItems[0], id: `matter-${index}` })), query);

    expect(result.items).toHaveLength(25);
    expect(result.rangeStart).toBe(26);
    expect(result.rangeEnd).toBe(50);
  });

  it("applies saved view filter configuration and preserves requested page", () => {
    const query = parseMattersQuery(new URLSearchParams("view=system-draft-intakes&page=2"));
    const applied = applySavedView(query, systemSavedViews);

    expect(applied.filters.draftIntake).toBe(true);
    expect(applied.page).toBe(2);
  });

  it("hides internal notes from billing development profile", () => {
    const detail = getDevelopmentMatterDetail("northstar-collins-claim", {
      id: "billing-profile",
      email: "billing@example.test",
      full_name: "Billing User",
      role: "billing",
      job_title: "Billing",
      avatar_url: null,
      is_active: true,
    });

    expect(detail?.canViewInternalNotes).toBe(false);
    expect(detail?.internalNotes).toBeNull();
  });
});
