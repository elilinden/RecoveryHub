"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, PlusCircle, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  createMattersQueryString,
  countActiveFilters,
  defaultMattersQuery,
  sortLabels,
} from "@/lib/matters-workspace/query";
import {
  intakeStatusLabels,
  labelFromValue,
  matterStageLabels,
  matterTypeLabels,
  priorityLabels,
} from "@/lib/matters-workspace/labels";
import type { MattersQueryState, WorkspaceFilterOptions, WorkspaceSavedView } from "@/lib/matters-workspace/types";
import { submitSaveMatterViewAction } from "@/lib/matters-workspace/actions";

type ActiveFilterChip = {
  key: string;
  label: string;
  href: string;
};

type MattersWorkspaceControlsProps = {
  query: MattersQueryState;
  filterOptions: WorkspaceFilterOptions;
  savedViews: WorkspaceSavedView[];
  canManageSharedViews: boolean;
  currentQueryString: string;
};

export function MattersWorkspaceControls({
  query,
  filterOptions,
  savedViews,
  canManageSharedViews,
  currentQueryString,
}: MattersWorkspaceControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query.q);
  const [isPending, startTransition] = useTransition();
  const activeFilterCount = countActiveFilters(query);
  const activeChips = useMemo(
    () => buildActiveFilterChips(query, savedViews, filterOptions),
    [filterOptions, query, savedViews]
  );

  const pushQuery = useMemo(
    () => (nextQuery: MattersQueryState) => {
      const next = createMattersQueryString(nextQuery, { page: 1 });
      router.push(next ? `${pathname}?${next}` : pathname);
    },
    [pathname, router]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === query.q) return;
      startTransition(() => {
        const next = createMattersQueryString(query, { q: search.trim(), page: 1, view: "" });
        router.push(next ? `${pathname}?${next}` : pathname);
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [pathname, query, router, search]);

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search matters</span>
          <Input
            className="h-10 rounded-lg border-border bg-card pr-9 text-sm shadow-sm"
            placeholder="Search matter, claim, carrier, party, or assignee"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button
              aria-label="Clear search"
              className="absolute right-2 top-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
              onClick={() => setSearch("")}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </label>
        <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
          <select
            aria-label="Sort matters"
            className="h-10 max-w-full rounded-lg border border-border bg-card px-3 text-sm shadow-sm"
            value={query.sort}
            onChange={(event) => pushQuery({ ...query, sort: event.target.value as MattersQueryState["sort"], page: 1, view: "" })}
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <SavedViewsMenu
            canManageSharedViews={canManageSharedViews}
            currentQueryString={currentQueryString}
            query={query}
            savedViews={savedViews}
          />
          <FilterSheet
            activeFilterCount={activeFilterCount}
            filterOptions={filterOptions}
            isPending={isPending}
            query={query}
          />
          {activeFilterCount > 0 || query.q || query.view ? (
            <Button asChild className="h-10" variant="ghost">
              <Link href="/matters">Clear All Filters</Link>
            </Button>
          ) : null}
        </div>
      </div>
      {activeChips.length > 0 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Active matter filters">
          {activeChips.map((chip) => (
            <Link
              aria-label={`Remove ${chip.label}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={chip.href}
              key={chip.key}
            >
              <span className="truncate">{chip.label}</span>
              <X aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
          <Button asChild className="h-8 px-2 text-xs" variant="ghost">
            <Link href="/matters">Clear All</Link>
          </Button>
          {isPending ? <span aria-live="polite">Updating results...</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function buildActiveFilterChips(
  query: MattersQueryState,
  savedViews: WorkspaceSavedView[],
  filterOptions: WorkspaceFilterOptions
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const makeHref = (nextQuery: MattersQueryState) => {
    const next = createMattersQueryString(nextQuery, { page: 1 });
    return next ? `/matters?${next}` : "/matters";
  };
  const filterHref = (filters: Partial<MattersQueryState["filters"]>) =>
    makeHref({
      ...query,
      view: "",
      filters: {
        ...query.filters,
        ...filters,
      },
    });

  const carrierLabel = filterOptions.carriers.find((item) => item.id === query.filters.carrier)?.name ?? query.filters.carrier;
  const adjusterLabel = filterOptions.adjusters.find((item) => item.id === query.filters.adjuster)?.name ?? query.filters.adjuster;
  const attorneyLabel = filterOptions.users.find((item) => item.id === query.filters.attorney)?.name ?? query.filters.attorney;
  const staffLabel = filterOptions.users.find((item) => item.id === query.filters.staff)?.name ?? query.filters.staff;

  if (query.q) {
    chips.push({
      key: "q",
      label: `Search: ${query.q}`,
      href: makeHref({ ...query, q: "", view: "" }),
    });
  }

  if (query.view) {
    chips.push({
      key: "view",
      label: `View: ${savedViews.find((view) => view.id === query.view)?.name ?? query.view}`,
      href: makeHref({ ...query, view: "" }),
    });
  }

  const stringFilters: Array<{
    key: keyof MattersQueryState["filters"];
    value: string;
    label: string;
  }> = [
    { key: "carrier", value: query.filters.carrier, label: `Carrier: ${carrierLabel}` },
    { key: "adjuster", value: query.filters.adjuster, label: `Adjuster: ${adjusterLabel}` },
    { key: "matterType", value: query.filters.matterType, label: `Type: ${matterTypeLabels[query.filters.matterType as keyof typeof matterTypeLabels] ?? labelFromValue(query.filters.matterType)}` },
    { key: "stage", value: query.filters.stage, label: `Stage: ${matterStageLabels[query.filters.stage as keyof typeof matterStageLabels] ?? labelFromValue(query.filters.stage)}` },
    { key: "priority", value: query.filters.priority, label: `Priority: ${priorityLabels[query.filters.priority as keyof typeof priorityLabels] ?? labelFromValue(query.filters.priority)}` },
    { key: "intakeStatus", value: query.filters.intakeStatus, label: `Intake: ${intakeStatusLabels[query.filters.intakeStatus as keyof typeof intakeStatusLabels] ?? labelFromValue(query.filters.intakeStatus)}` },
    { key: "jurisdiction", value: query.filters.jurisdiction, label: `Jurisdiction: ${query.filters.jurisdiction}` },
    { key: "attorney", value: query.filters.attorney, label: `Attorney: ${attorneyLabel}` },
    { key: "staff", value: query.filters.staff, label: `Staff: ${staffLabel}` },
    { key: "minAmount", value: query.filters.minAmount, label: `Min amount: ${query.filters.minAmount}` },
    { key: "maxAmount", value: query.filters.maxAmount, label: `Max amount: ${query.filters.maxAmount}` },
    { key: "nextAction", value: query.filters.nextAction, label: `Next action: ${query.filters.nextAction}` },
    { key: "deadlineWindow", value: query.filters.deadlineWindow, label: `Deadline: within ${query.filters.deadlineWindow} days` },
    { key: "staleDays", value: query.filters.staleDays, label: query.filters.staleDays === "custom" ? "Stale: custom" : `Stale: ${query.filters.staleDays} days` },
    { key: "customStaleDays", value: query.filters.customStaleDays, label: `Custom stale: ${query.filters.customStaleDays} days` },
  ];

  for (const filter of stringFilters) {
    if (!filter.value) continue;
    chips.push({
      key: filter.key,
      label: filter.label,
      href: filterHref({ [filter.key]: defaultMattersQuery.filters[filter.key] }),
    });
  }

  const booleanLabels: Array<{ key: keyof MattersQueryState["filters"]; label: string }> = [
    { key: "amountRecovered", label: "Amount recovered" },
    { key: "noAmountSought", label: "No amount sought" },
    { key: "needsAttention", label: "Needs attention" },
    { key: "overdueNextAction", label: "Overdue next action" },
    { key: "missingNextAction", label: "Missing next action" },
    { key: "draftIntake", label: "Draft intake" },
    { key: "readyForDemand", label: "Ready for demand" },
    { key: "awaitingClient", label: "Awaiting client" },
    { key: "closed", label: "Include closed" },
    { key: "archived", label: "Include archived" },
    { key: "archivedOnly", label: "Archived only" },
    { key: "overdueDeadline", label: "Overdue deadline" },
    { key: "missingStatuteDeadline", label: "Missing statute deadline" },
    { key: "unverifiedDeadline", label: "Unverified statute deadline" },
    { key: "missingInformation", label: "Missing information" },
    { key: "missingAdjuster", label: "Missing adjuster" },
    { key: "missingResponsibleParty", label: "Missing responsible party" },
    { key: "unknownInsurance", label: "Unknown insurance status" },
    { key: "unknownLiability", label: "Unknown liability assessment" },
    { key: "missingPaymentDocumentation", label: "Missing payment documentation" },
    { key: "missingRequiredEvidence", label: "Missing required evidence" },
  ];

  for (const filter of booleanLabels) {
    if (query.filters[filter.key] !== true) continue;
    chips.push({
      key: filter.key,
      label: filter.label,
      href: filterHref({ [filter.key]: false }),
    });
  }

  return chips;
}

function SavedViewsMenu({
  savedViews,
  query,
  canManageSharedViews,
  currentQueryString,
}: {
  savedViews: WorkspaceSavedView[];
  query: MattersQueryState;
  canManageSharedViews: boolean;
  currentQueryString: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="h-10 shrink-0 gap-2" type="button" variant="outline">
          <Bookmark aria-hidden="true" className="size-4" />
          Saved Views
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Saved views</SheetTitle>
          <SheetDescription>Return to useful matter filters and save your current workspace.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4">
          <div className="space-y-2">
            {savedViews.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No saved views yet. Save a useful combination of filters to return to it later.
              </div>
            ) : (
              savedViews.map((view) => (
                <Link
                  className="block rounded-lg border border-border bg-card p-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={`/matters?view=${encodeURIComponent(view.id)}`}
                  key={view.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground">{view.name}</span>
                    <Badge variant="outline">{view.scope}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{view.description}</p>
                </Link>
              ))
            )}
          </div>
          <form action={submitSaveMatterViewAction} className="space-y-3 rounded-lg border border-border bg-background p-3">
            <input name="queryString" type="hidden" value={currentQueryString} />
            <label className="space-y-2 text-sm font-medium text-foreground">
              <span>Save current view</span>
              <Input name="name" placeholder="View name" />
            </label>
            {canManageSharedViews ? (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input name="isShared" type="checkbox" />
                Shared with the firm
              </label>
            ) : null}
            <Button className="gap-2" type="submit">
              <PlusCircle aria-hidden="true" className="size-4" />
              Save View
            </Button>
          </form>
          {query.view ? (
            <Button asChild variant="outline">
              <Link href="/matters">Return to default view</Link>
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterSheet({
  query,
  filterOptions,
  activeFilterCount,
  isPending,
}: {
  query: MattersQueryState;
  filterOptions: WorkspaceFilterOptions;
  activeFilterCount: number;
  isPending: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="h-10 shrink-0 gap-2" type="button" variant="outline">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters
          {activeFilterCount > 0 ? <Badge variant="outline">{activeFilterCount}</Badge> : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Matter filters</SheetTitle>
          <SheetDescription>Filter by responsibility, value, workflow, deadlines, and information quality.</SheetDescription>
        </SheetHeader>
        <form action="/matters" className="grid gap-5 px-4 pb-4">
          <input name="q" type="hidden" value={query.q} />
          <input name="sort" type="hidden" value={query.sort} />
          <FilterGroup title="Matter Information">
            <SelectField label="Carrier" name="carrier" value={query.filters.carrier} options={filterOptions.carriers.map((item) => ({ value: item.id, label: item.name }))} />
            <SelectField label="Assigned adjuster" name="adjuster" value={query.filters.adjuster} options={filterOptions.adjusters.map((item) => ({ value: item.id, label: item.name }))} />
            <SelectField label="Matter type" name="matterType" value={query.filters.matterType} options={Object.entries(matterTypeLabels).map(([value, label]) => ({ value, label }))} />
            <SelectField label="Stage" name="stage" value={query.filters.stage} options={Object.entries(matterStageLabels).map(([value, label]) => ({ value, label }))} />
            <SelectField label="Priority" name="priority" value={query.filters.priority} options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))} />
            <SelectField label="Intake status" name="intakeStatus" value={query.filters.intakeStatus} options={Object.entries(intakeStatusLabels).map(([value, label]) => ({ value, label }))} />
            <SelectField label="Jurisdiction" name="jurisdiction" value={query.filters.jurisdiction} options={filterOptions.jurisdictions.map((value) => ({ value, label: value }))} />
            <SelectField label="Assigned attorney" name="attorney" value={query.filters.attorney} options={filterOptions.users.filter((user) => ["admin", "partner", "attorney"].includes(user.role)).map((item) => ({ value: item.id, label: item.name }))} />
            <SelectField label="Assigned staff" name="staff" value={query.filters.staff} options={filterOptions.users.filter((user) => user.role === "staff").map((item) => ({ value: item.id, label: item.name }))} />
          </FilterGroup>

          <FilterGroup title="Financial">
            <InputField label="Minimum amount sought" name="minAmount" value={query.filters.minAmount} />
            <InputField label="Maximum amount sought" name="maxAmount" value={query.filters.maxAmount} />
            <CheckboxField checked={query.filters.amountRecovered} label="Amount recovered greater than zero" name="amountRecovered" />
            <CheckboxField checked={query.filters.noAmountSought} label="No amount sought recorded" name="noAmountSought" />
          </FilterGroup>

          <FilterGroup title="Workflow">
            <SelectField label="Next action" name="nextAction" value={query.filters.nextAction} options={filterOptions.nextActions.map((value) => ({ value, label: value }))} />
            <CheckboxField checked={query.filters.needsAttention} label="Needs attention" name="needsAttention" />
            <CheckboxField checked={query.filters.overdueNextAction} label="Overdue next action" name="overdueNextAction" />
            <CheckboxField checked={query.filters.missingNextAction} label="Missing next action" name="missingNextAction" />
            <CheckboxField checked={query.filters.draftIntake} label="Draft intake" name="draftIntake" />
            <CheckboxField checked={query.filters.readyForDemand} label="Ready for demand" name="readyForDemand" />
            <CheckboxField checked={query.filters.awaitingClient} label="Awaiting client" name="awaitingClient" />
            <CheckboxField checked={query.filters.closed} label="Include closed" name="closed" />
            <CheckboxField checked={query.filters.archived} label="Include archived" name="archived" />
            <CheckboxField checked={query.filters.archivedOnly} label="Archived only" name="archivedOnly" />
          </FilterGroup>

          <FilterGroup title="Deadlines and Activity">
            <SelectField label="Statute deadline window" name="deadlineWindow" value={query.filters.deadlineWindow} options={[{ value: "30", label: "Within 30 days" }, { value: "60", label: "Within 60 days" }, { value: "90", label: "Within 90 days" }]} />
            <CheckboxField checked={query.filters.overdueDeadline} label="Overdue deadline" name="overdueDeadline" />
            <CheckboxField checked={query.filters.missingStatuteDeadline} label="Missing statute deadline" name="missingStatuteDeadline" />
            <CheckboxField checked={query.filters.unverifiedDeadline} label="Unverified statute deadline" name="unverifiedDeadline" />
            <SelectField label="No substantive activity" name="staleDays" value={query.filters.staleDays} options={[{ value: "14", label: "Within 14 days" }, { value: "30", label: "Within 30 days" }, { value: "60", label: "Within 60 days" }, { value: "custom", label: "Custom period" }]} />
            <InputField label="Custom stale days" name="customStaleDays" value={query.filters.customStaleDays} />
          </FilterGroup>

          <FilterGroup title="Information Quality">
            <CheckboxField checked={query.filters.missingInformation} label="Missing information" name="missingInformation" />
            <CheckboxField checked={query.filters.missingAdjuster} label="Missing assigned adjuster" name="missingAdjuster" />
            <CheckboxField checked={query.filters.missingResponsibleParty} label="Missing responsible party" name="missingResponsibleParty" />
            <CheckboxField checked={query.filters.unknownInsurance} label="Unknown insurance status" name="unknownInsurance" />
            <CheckboxField checked={query.filters.unknownLiability} label="Unknown liability assessment" name="unknownLiability" />
            <CheckboxField checked={query.filters.missingPaymentDocumentation} label="Missing payment documentation" name="missingPaymentDocumentation" />
            <CheckboxField checked={query.filters.missingRequiredEvidence} label="Missing required evidence" name="missingRequiredEvidence" />
          </FilterGroup>

          <SheetFooter className="p-0">
            <Button disabled={isPending} type="submit">Apply Filters</Button>
            <Button asChild variant="outline">
              <Link href="/matters">Clear All Filters</Link>
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <legend className="px-1 text-sm font-semibold text-foreground">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function SelectField({ label, name, value, options }: { label: string; name: string; value: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="space-y-1 text-sm text-foreground">
      <span>{label}</span>
      <select className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" defaultValue={value} name={name}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="space-y-1 text-sm text-foreground">
      <span>{label}</span>
      <Input defaultValue={value} inputMode="decimal" name={name} />
    </label>
  );
}

function CheckboxField({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input defaultChecked={checked} name={name} type="checkbox" value="1" />
      {label}
    </label>
  );
}
