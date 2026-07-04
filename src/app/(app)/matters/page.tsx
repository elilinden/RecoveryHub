import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DataTableShell } from "@/components/common/data-table-shell";
import { DateDisplay } from "@/components/common/date-display";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { MatterWarnings, MatterWorkspaceCard } from "@/components/matters/matter-workspace-card";
import { MattersWorkspaceControls } from "@/components/matters/matters-workspace-controls";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { requireActiveProfile } from "@/lib/auth/session";
import { intakeStatusLabels, matterStageLabels } from "@/lib/matters-workspace/labels";
import { createMattersQueryString, countActiveFilters } from "@/lib/matters-workspace/query";
import { loadMattersWorkspace } from "@/lib/matters-workspace/data";
import type { MatterStatus } from "@/lib/types";

type MattersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const matterColumns = [
  { key: "matter", header: "Matter", className: "sticky left-0 z-30 w-[12rem] min-w-[12rem] bg-secondary/95" },
  { key: "carrier", header: "Carrier", className: "w-[8rem] min-w-[8rem]" },
  { key: "amount", header: "Amount sought", className: "w-[7rem] min-w-[7rem] text-right" },
  { key: "stage", header: "Current stage", className: "w-[9rem] min-w-[9rem]" },
  { key: "nextAction", header: "Next action", className: "w-[10rem] min-w-[10rem]" },
  { key: "nextDue", header: "Next-action due", className: "w-[7rem] min-w-[7rem]" },
  { key: "warnings", header: "Primary Issue", className: "w-[11rem] min-w-[11rem] pr-6" },
];

export default async function MattersPage({ searchParams }: MattersPageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireActiveProfile();
  const { result, filterOptions, savedViews } = await loadMattersWorkspace({ profile: session.profile, searchParams: params });
  if (result.totalCount > 0 && result.query.page > 1 && result.items.length === 0) {
    const lastPage = Math.max(1, Math.ceil(result.totalCount / result.query.pageSize));
    redirect(`/matters?${createMattersQueryString(result.query, { page: lastPage })}`);
  }
  const activeFilterCount = countActiveFilters(result.query);
  const currentQueryString = createMattersQueryString(result.query);
  const canManageSharedViews = session.profile.role === "admin" || session.profile.role === "partner";
  const emptyState = getEmptyState(Boolean(result.query.q), activeFilterCount);

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        actions={
          <Button asChild className="h-10 gap-2">
            <Link href="/matters/new">
              <PlusCircle aria-hidden="true" className="size-4" />
              Add Matter
            </Link>
          </Button>
        }
        subtitle={`Find, review, and manage active recovery matters. ${result.totalCount} matter${result.totalCount === 1 ? "" : "s"}.`}
        title="Matters"
      />

      <MattersWorkspaceControls
        canManageSharedViews={canManageSharedViews}
        currentQueryString={currentQueryString}
        filterOptions={filterOptions}
        key={currentQueryString}
        query={result.query}
        savedViews={savedViews}
      />

      {result.items.length > 0 ? (
        <>
          <div className="hidden min-w-0 lg:block">
            <DataTableShell columns={matterColumns}>
              {result.items.map((matter) => {
                const href = matter.intakeStatus === "complete" ? `/matters/${matter.id}` : `/matters/${matter.id}/intake`;
                return (
                  <TableRow className="group h-14 cursor-pointer transition-colors hover:bg-[var(--info-muted)] focus-within:bg-[var(--info-muted)]" key={matter.id}>
                    <TableCell className="sticky left-0 z-10 w-[12rem] min-w-[12rem] bg-card px-3 py-2 group-hover:bg-muted">
                      <Link className="line-clamp-2 rounded-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={href} title={matter.matterName}>
                        {matter.matterName}
                      </Link>
                      <p className="mt-1 truncate text-xs text-muted-foreground" title={matter.carrierClaimNumber ?? "No claim number"}>
                        {matter.carrierClaimNumber ?? "No claim number"}
                      </p>
                      {matter.intakeStatus !== "complete" ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={intakeStatusLabels[matter.intakeStatus] as MatterStatus} />
                          <Link className="text-xs font-semibold text-primary hover:underline" href={href}>
                            Resume →
                          </Link>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="w-[8rem] min-w-[8rem] truncate px-3 py-2 text-muted-foreground" title={matter.carrierName}>
                      {matter.carrierName}
                    </TableCell>
                    <TableCell className="w-[7rem] min-w-[7rem] px-3 py-2 text-right font-medium">
                      <CurrencyDisplay className="justify-end" value={matter.amountSought} />
                    </TableCell>
                    <TableCell className="w-[9rem] min-w-[9rem] px-3 py-2">
                      <StatusBadge status={matterStageLabels[matter.stage] as MatterStatus} />
                    </TableCell>
                    <TableCell className="w-[10rem] min-w-[10rem] px-3 py-2 text-muted-foreground">
                      <span className="line-clamp-2 whitespace-normal" title={matter.nextAction ?? "Not assigned"}>
                        {matter.nextAction ?? "Not assigned"}
                      </span>
                    </TableCell>
                    <TableCell className="w-[7rem] min-w-[7rem] px-3 py-2 text-muted-foreground">
                      {matter.nextActionDueDate ? <DateDisplay value={matter.nextActionDueDate} /> : "Not set"}
                    </TableCell>
                    <TableCell className="w-[11rem] min-w-[11rem] px-3 py-2 pr-6">
                      <MatterWarnings warnings={matter.warnings.slice(0, 1)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </DataTableShell>
          </div>

          <div className="grid min-w-0 gap-3 lg:hidden">
            {result.items.map((matter) => (
              <MatterWorkspaceCard key={matter.id} matter={matter} />
            ))}
          </div>

          {result.totalCount > result.query.pageSize ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {result.rangeStart}-{result.rangeEnd} of {result.totalCount} matters
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {result.query.page <= 1 ? (
                  <Button disabled size="sm" variant="outline">
                    <ChevronLeft aria-hidden="true" className="size-4" />
                    Previous
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/matters?${createMattersQueryString(result.query, { page: Math.max(1, result.query.page - 1) })}`}>
                      <ChevronLeft aria-hidden="true" className="size-4" />
                      Previous
                    </Link>
                  </Button>
                )}
                {result.rangeEnd >= result.totalCount ? (
                  <Button disabled size="sm" variant="outline">
                    Next
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/matters?${createMattersQueryString(result.query, { page: result.query.page + 1 })}`}>
                      Next
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/matters/new">Add Matter</Link>
              </Button>
              {activeFilterCount > 0 || result.query.q ? (
                <Button asChild variant="outline">
                  <Link href="/matters">Clear filters</Link>
                </Button>
              ) : null}
            </div>
          }
          description={emptyState.description}
          title={emptyState.title}
        />
      )}
    </div>
  );
}

function getEmptyState(hasSearch: boolean, activeFilterCount: number) {
  if (hasSearch) {
    return {
      title: "No matters match your search",
      description: "Try a different matter name, claim number, carrier, or party.",
    };
  }
  if (activeFilterCount > 0) {
    return {
      title: "No matters match these filters",
      description: "Clear one or more filters to broaden the results.",
    };
  }
  return {
    title: "No matters have been added",
    description: "Create the first matter to begin tracking recovery work.",
  };
}
