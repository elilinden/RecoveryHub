import Link from "next/link";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DataTableShell } from "@/components/common/data-table-shell";
import { DateDisplay } from "@/components/common/date-display";
import { EmptyState } from "@/components/common/empty-state";
import { FilterButton } from "@/components/common/filter-button";
import { FollowUpIndicators } from "@/components/common/follow-up-indicators";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { StatusBadge } from "@/components/common/status-badge";
import { MatterFilterPanel } from "@/components/matters/matter-filter-panel";
import { MatterMobileCard } from "@/components/matters/matter-mobile-card";
import { SavedViewsControl } from "@/components/matters/saved-views-control";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { matters, savedViews } from "@/lib/mock-data";
import { listMatterSavedViews } from "@/lib/data/saved-views";
import { listIntakeDrafts } from "@/lib/intake/drafts";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { SavedView } from "@/lib/types";

type MattersPageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

const matterColumns = [
  { key: "matter", header: "Matter" },
  { key: "carrier", header: "Carrier" },
  { key: "adjuster", header: "Assigned adjuster" },
  { key: "claim", header: "Claim number" },
  { key: "amount", header: "Amount sought" },
  { key: "attorney", header: "Assigned attorney" },
  { key: "stage", header: "Current stage" },
  { key: "action", header: "Next action" },
  { key: "activity", header: "Activity age" },
  { key: "indicators", header: "Indicators" },
  { key: "deadline", header: "Deadline" },
  { key: "updated", header: "Last updated" },
];

const viewLabels: Record<string, string> = {
  "new-referrals": "New referrals",
  "missing-information": "Missing information",
  "upcoming-deadlines": "Upcoming deadlines",
  "ready-for-demand": "Ready for demand",
  "needs-follow-up": "Needs follow-up",
};

export default async function MattersPage({ searchParams }: MattersPageProps) {
  const params = await searchParams;
  const viewLabel = params?.view ? viewLabels[params.view] : undefined;
  let availableViews: SavedView[] = savedViews;
  const intakeDrafts = await listIntakeDrafts();

  if (isSupabaseConfigured()) {
    const databaseViews = await listMatterSavedViews();
    availableViews =
      databaseViews.length > 0
        ? databaseViews.map((view) => ({
            id: view.id,
            name: view.name,
            page: "matters",
            scope: view.is_shared ? "shared" : "personal",
            description: view.is_shared ? "Shared database-backed saved view." : "Personal database-backed saved view.",
          }))
        : savedViews;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button asChild className="h-10 gap-2">
            <Link href="/matters/new">
              <PlusCircle aria-hidden="true" className="size-4" />
              Add Matter
            </Link>
          </Button>
        }
        subtitle={viewLabel ? `Showing workspace view: ${viewLabel}.` : "Search, review, and prioritize recovery matters."}
        title="Matters"
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput label="Search matters" placeholder="Search by matter, carrier, or claim number" />
        <div className="flex flex-wrap items-center gap-2">
          <SavedViewsControl views={availableViews} />
          <FilterButton />
        </div>
      </div>
      <MatterFilterPanel />

      {intakeDrafts.length > 0 ? (
        <section aria-labelledby="draft-intakes-heading" className="space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="draft-intakes-heading" className="text-lg font-semibold text-foreground">
                Draft Intakes
              </h2>
              <p className="text-sm text-muted-foreground">Saved referrals that have not yet been completed as active matters.</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {intakeDrafts.map((draft) => (
              <Card className="border-border bg-card shadow-sm" key={draft.id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className="font-medium text-foreground hover:underline" href={`/matters/${draft.id}/intake`}>
                        {draft.matterName}
                      </Link>
                      <StatusBadge status={draft.status === "in_progress" ? "Under review" : "New referral"} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {draft.carrierName} · {draft.carrierClaimNumber ?? "No claim number"} · Step {draft.currentStep} of 3
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Last autosaved: {draft.lastAutosavedAt ? <DateDisplay value={draft.lastAutosavedAt.slice(0, 10)} /> : "Not yet autosaved"}
                    </p>
                  </div>
                  <Button asChild className="shrink-0" size="sm" variant="outline">
                    <Link href={`/matters/${draft.id}/intake`}>Resume Intake</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {matters.length > 0 ? (
        <>
          <div className="hidden 2xl:block">
            <DataTableShell columns={matterColumns}>
              {matters.map((matter) => (
                <TableRow className="h-16" key={matter.id}>
                  <TableCell>
                    <Link className="font-medium text-foreground hover:underline" href={`/matters/${matter.id}`}>
                      {matter.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{matter.carrier}</TableCell>
                  <TableCell className="text-muted-foreground">{matter.assignedAdjuster}</TableCell>
                  <TableCell className="text-muted-foreground">{matter.claimNumber}</TableCell>
                  <TableCell className="font-medium">
                    <CurrencyDisplay value={matter.amountSought} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{matter.assignedAttorney}</TableCell>
                  <TableCell>
                    <StatusBadge status={matter.stage} />
                  </TableCell>
                  <TableCell className="max-w-56 text-muted-foreground">{matter.nextAction ?? "Not assigned"}</TableCell>
                  <TableCell className="text-muted-foreground">{matter.daysSinceLastSubstantiveActivity} days</TableCell>
                  <TableCell>
                    <FollowUpIndicators reasons={matter.followUpReasons} />
                  </TableCell>
                  <TableCell>
                    <DateDisplay value={matter.statuteDeadline} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <DateDisplay value={matter.lastUpdated} />
                  </TableCell>
                </TableRow>
              ))}
            </DataTableShell>
          </div>

          <div className="grid gap-3 2xl:hidden">
            {matters.map((matter) => (
              <MatterMobileCard key={matter.id} matter={matter} />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Showing 1-{matters.length} of {matters.length} matters</p>
            <div className="flex items-center gap-2">
              <Button disabled size="sm" type="button" variant="outline">
                <ChevronLeft aria-hidden="true" className="size-4" />
                Previous
              </Button>
              <Button disabled size="sm" type="button" variant="outline">
                Next
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          action={
            <Button asChild>
              <Link href="/matters/new">Add Matter</Link>
            </Button>
          }
          description="Once referrals are added, they will appear here with stage, deadline, and next-action context."
          title="No matters found"
        />
      )}
    </div>
  );
}
