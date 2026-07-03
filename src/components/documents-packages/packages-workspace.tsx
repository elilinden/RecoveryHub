import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DataTableShell } from "@/components/common/data-table-shell";
import { DateDisplay } from "@/components/common/date-display";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  submitApprovePackageForSendAction,
  submitPackageForReviewFormAction,
  submitRequestPackageChangesAction,
} from "@/lib/documents-packages/actions";
import {
  packageSortLabels,
  packageStatusLabels,
  packageTypeLabels,
  verificationStatusLabels,
} from "@/lib/documents-packages/labels";
import { createPackageQueryString, countActivePackageFilters, packageViews } from "@/lib/documents-packages/query";
import type { OutboundPackage, PackageWorkspaceResult } from "@/lib/documents-packages/types";
import { PackageStatusBadge, ValidationSeverityBadge, VerificationBadge } from "@/components/documents-packages/document-package-badges";

type PackagesWorkspaceProps = {
  result: PackageWorkspaceResult;
};

const columns = [
  { key: "package", header: "Package", className: "w-[18rem] min-w-[18rem]" },
  { key: "matter", header: "Matter", className: "w-[17rem] min-w-[17rem]" },
  { key: "carrier", header: "Carrier", className: "w-[12rem] min-w-[12rem]" },
  { key: "type", header: "Type", className: "w-[12rem] min-w-[12rem]" },
  { key: "recipient", header: "Recipient", className: "w-[16rem] min-w-[16rem]" },
  { key: "amount", header: "Amount", className: "w-[10rem] min-w-[10rem] text-right" },
  { key: "deadline", header: "Deadline", className: "w-[10rem] min-w-[10rem]" },
  { key: "status", header: "Status", className: "w-[12rem] min-w-[12rem]" },
  { key: "actions", header: "Review", className: "w-[16rem] min-w-[16rem]" },
];

export function PackagesWorkspace({ result }: PackagesWorkspaceProps) {
  const activeCount = countActivePackageFilters(result.query);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {packageViews.map((view) => (
          <Link
            className="rounded-lg border border-border bg-card p-4 shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/packages?${createPackageQueryString(result.query, { view: view.id, page: 1 })}`}
            key={view.id}
          >
            <p className="font-semibold text-foreground">{view.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{view.description}</p>
          </Link>
        ))}
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-4 p-4">
          <SectionHeader
            description="Search, filter, validate, and review packages prepared for later delivery. No send action exists in this phase."
            title="Package Queue"
          />
          <form action="/packages" className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search packages</span>
              <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
                defaultValue={result.query.q}
                name="q"
                placeholder="Search package, matter, claim, carrier, recipient, or email"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" defaultValue={result.query.status} name="status" aria-label="Filter by status">
                <option value="">Any status</option>
                {Object.entries(packageStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" defaultValue={result.query.packageType} name="packageType" aria-label="Filter by package type">
                <option value="">Any type</option>
                {Object.entries(packageTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" defaultValue={result.query.verification} name="verification" aria-label="Filter by recipient verification">
                <option value="">Any verification</option>
                {Object.entries(verificationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" defaultValue={result.query.sort} name="sort" aria-label="Sort packages">
                {Object.entries(packageSortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input name="view" type="hidden" value={result.query.view} />
              <Button type="submit" variant="outline">Apply</Button>
              {activeCount > 0 ? <Button asChild variant="ghost"><Link href="/packages">Clear All</Link></Button> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {result.packages.length === 0 ? (
        <EmptyState
          description={result.query.view === "ready-for-review" ? "Submitted packages will appear here." : "Packages will appear after preparation begins."}
          title={result.query.view === "ready-for-review" ? "No packages are waiting for review" : "No outbound packages found"}
        />
      ) : (
        <>
          <div className="hidden lg:block">
            <DataTableShell columns={columns}>
              {result.packages.map((outboundPackage) => <PackageQueueRow key={outboundPackage.id} outboundPackage={outboundPackage} />)}
            </DataTableShell>
          </div>
          <div className="grid gap-3 lg:hidden">
            {result.packages.map((outboundPackage) => <PackageQueueCard key={outboundPackage.id} outboundPackage={outboundPackage} />)}
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {result.rangeStart}-{result.rangeEnd} of {result.totalCount} packages</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild disabled={result.query.page <= 1} size="sm" variant="outline">
                <Link aria-disabled={result.query.page <= 1} href={`/packages?${createPackageQueryString(result.query, { page: Math.max(1, result.query.page - 1) })}`}>
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Previous
                </Link>
              </Button>
              <Button asChild disabled={result.rangeEnd >= result.totalCount} size="sm" variant="outline">
                <Link aria-disabled={result.rangeEnd >= result.totalCount} href={`/packages?${createPackageQueryString(result.query, { page: result.query.page + 1 })}`}>
                  Next
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PackageQueueRow({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  const primaryRecipient = outboundPackage.recipients[0];
  const blocking = outboundPackage.validations.find((validation) => validation.status === "failed");
  return (
    <TableRow className="h-14">
      <TableCell className="px-3 py-2">
        <p className="font-medium text-foreground">{outboundPackage.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{outboundPackage.documents.length} files · {outboundPackage.createdByName ?? "Unknown preparer"}</p>
      </TableCell>
      <TableCell className="px-3 py-2">
        <Link className="font-medium text-foreground hover:underline" href={`/matters/${outboundPackage.matterId}`}>{outboundPackage.matterName}</Link>
        <p className="mt-1 text-xs text-muted-foreground">{outboundPackage.claimNumberSnapshot ?? "No claim number"}</p>
      </TableCell>
      <TableCell className="px-3 py-2 text-muted-foreground">{outboundPackage.carrierName}</TableCell>
      <TableCell className="px-3 py-2 text-muted-foreground">{packageTypeLabels[outboundPackage.packageType]}</TableCell>
      <TableCell className="px-3 py-2">
        <p className="font-medium text-foreground">{primaryRecipient?.recipientNameSnapshot ?? "No recipient"}</p>
        {primaryRecipient ? <VerificationBadge status={primaryRecipient.verificationStatus} /> : null}
      </TableCell>
      <TableCell className="px-3 py-2 text-right font-medium">{outboundPackage.amountDemanded !== null ? <CurrencyDisplay value={outboundPackage.amountDemanded} /> : "Not set"}</TableCell>
      <TableCell className="px-3 py-2">{outboundPackage.responseDeadline ? <DateDisplay value={outboundPackage.responseDeadline} /> : "Not set"}</TableCell>
      <TableCell className="px-3 py-2">
        <div className="flex flex-col gap-2">
          <PackageStatusBadge status={outboundPackage.status} />
          {blocking ? <ValidationSeverityBadge severity={blocking.severity} /> : null}
        </div>
      </TableCell>
      <TableCell className="px-3 py-2">
        <PackageReviewActions outboundPackage={outboundPackage} />
      </TableCell>
    </TableRow>
  );
}

function PackageQueueCard({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  const primaryRecipient = outboundPackage.recipients[0];
  return (
    <Card className="min-w-0 border-border bg-card shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground" title={outboundPackage.title}>{outboundPackage.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{outboundPackage.matterName}</p>
          </div>
          <PackageStatusBadge status={outboundPackage.status} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Carrier</dt><dd className="font-medium text-foreground">{outboundPackage.carrierName}</dd></div>
          <div><dt className="text-muted-foreground">Type</dt><dd className="font-medium text-foreground">{packageTypeLabels[outboundPackage.packageType]}</dd></div>
          <div><dt className="text-muted-foreground">Recipient</dt><dd className="font-medium text-foreground">{primaryRecipient?.recipientNameSnapshot ?? "No recipient"}</dd></div>
          <div><dt className="text-muted-foreground">Verification</dt><dd>{primaryRecipient ? <VerificationBadge status={primaryRecipient.verificationStatus} /> : "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Amount</dt><dd className="font-medium text-foreground">{outboundPackage.amountDemanded !== null ? <CurrencyDisplay value={outboundPackage.amountDemanded} /> : "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Deadline</dt><dd className="font-medium text-foreground">{outboundPackage.responseDeadline ? <DateDisplay value={outboundPackage.responseDeadline} /> : "Not set"}</dd></div>
        </dl>
        <PackageReviewActions outboundPackage={outboundPackage} />
      </CardContent>
    </Card>
  );
}

function PackageReviewActions({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  return (
    <div className="flex flex-wrap gap-2">
      {outboundPackage.status === "draft" || outboundPackage.status === "assembling" || outboundPackage.status === "validation_needed" || outboundPackage.status === "changes_requested" ? (
        <form action={submitPackageForReviewFormAction}>
          <input name="packageId" type="hidden" value={outboundPackage.id} />
          <Button size="sm" type="submit" variant="outline">Submit</Button>
        </form>
      ) : null}
      {outboundPackage.status === "ready_for_review" ? (
        <>
          <form action={submitRequestPackageChangesAction}>
            <input name="packageId" type="hidden" value={outboundPackage.id} />
            <input name="comments" type="hidden" value="Changes requested from package queue." />
            <Button size="sm" type="submit" variant="outline">Request Changes</Button>
          </form>
          <form action={submitApprovePackageForSendAction}>
            <input name="packageId" type="hidden" value={outboundPackage.id} />
            <input name="comments" type="hidden" value="Approved for later send workflow." />
            <Button size="sm" type="submit">Approve</Button>
          </form>
        </>
      ) : null}
      {outboundPackage.status === "approved_for_send" ? <span className="text-sm text-muted-foreground">No Send action in this phase</span> : null}
    </div>
  );
}
