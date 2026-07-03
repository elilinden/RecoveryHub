"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  submitApprovePackageForSendAction,
  submitPackageForReviewFormAction,
  submitRequestPackageChangesAction,
} from "@/lib/documents-packages/actions";
import {
  emailSourceLabels,
  packageSortLabels,
  packageStatusLabels,
  packageTypeLabels,
  recipientRoleLabels,
  validationSeverityLabels,
  validationStatusLabels,
  verificationStatusLabels,
} from "@/lib/documents-packages/labels";
import { createPackageQueryString, countActivePackageFilters, packageViews } from "@/lib/documents-packages/query";
import type { OutboundPackage, PackageValidation, PackageWorkspaceResult } from "@/lib/documents-packages/types";
import { PackageStatusBadge, ValidationSeverityBadge, VerificationBadge } from "@/components/documents-packages/document-package-badges";
import { cn } from "@/lib/utils";

type PackagesWorkspaceProps = {
  result: PackageWorkspaceResult;
};

const actionViewIds = new Set(["needs-validation", "ready-for-review", "changes-requested", "unverified-recipients", "missing-attachments"]);
const severityRank: Record<PackageValidation["severity"], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  informational: 1,
};

export function PackagesWorkspace({ result }: PackagesWorkspaceProps) {
  const activeCount = countActivePackageFilters(result.query);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {packageViews.map((view) => {
          const isActive = result.query.view === view.id;
          const requiresAction = actionViewIds.has(view.id);
          return (
            <Link
              className={cn(
                "min-w-0 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                requiresAction ? "border-primary/25" : "border-border",
                isActive ? "border-primary bg-[var(--info-muted)]" : null,
              )}
              href={`/packages?${createPackageQueryString(result.query, { view: view.id, page: 1 })}`}
              key={view.id}
            >
              <p className="truncate text-sm font-semibold text-foreground" title={view.name}>{view.name}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground" title={view.description}>{view.description}</p>
            </Link>
          );
        })}
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-4 p-4">
          <SectionHeader
            description="Search, filter, validate, and review packages prepared for later delivery."
            title="Package Queue"
          />
          <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground" role="note">
            Packages may be prepared and approved here. Delivery will be added in a later phase.
          </p>
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
            <div className="flex min-w-0 flex-wrap gap-2">
              <select className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm sm:min-w-40" defaultValue={result.query.status} name="status" aria-label="Filter by status">
                <option value="">Any status</option>
                {Object.entries(packageStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm sm:min-w-36" defaultValue={result.query.packageType} name="packageType" aria-label="Filter by package type">
                <option value="">Any type</option>
                {Object.entries(packageTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm sm:min-w-44" defaultValue={result.query.verification} name="verification" aria-label="Filter by recipient verification">
                <option value="">Any verification</option>
                {Object.entries(verificationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm sm:min-w-44" defaultValue={result.query.sort} name="sort" aria-label="Sort packages">
                {Object.entries(packageSortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input name="view" type="hidden" value={result.query.view} />
              <Button className="h-10" type="submit" variant="outline">Apply</Button>
              {activeCount > 0 ? <Button asChild className="h-10" variant="ghost"><Link href="/packages">Clear All</Link></Button> : null}
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
          <div className="package-queue rounded-lg border border-border bg-card shadow-sm">
            <div className="package-queue-desktop" role="table" aria-label="Package Queue">
              <div className="package-queue-header package-queue-grid" role="row">
                <div role="columnheader">Package &amp; Matter</div>
                <div role="columnheader">Recipient</div>
                <div role="columnheader">Amount &amp; Deadline</div>
                <div className="package-queue-status-header" role="columnheader">
                  Status<span className="package-queue-status-action-label"> &amp; Action</span>
                </div>
                <div className="package-queue-action-header" role="columnheader">Action</div>
              </div>
              <div role="rowgroup">
                {result.packages.map((outboundPackage) => (
                  <PackageQueueRow
                    expanded={expandedPackageId === outboundPackage.id}
                    key={outboundPackage.id}
                    onToggle={() => setExpandedPackageId((current) => (current === outboundPackage.id ? null : outboundPackage.id))}
                    outboundPackage={outboundPackage}
                  />
                ))}
              </div>
            </div>
            <div className="package-queue-mobile grid gap-3 p-3">
              {result.packages.map((outboundPackage) => (
                <PackageQueueCard
                  expanded={expandedPackageId === outboundPackage.id}
                  key={outboundPackage.id}
                  onToggle={() => setExpandedPackageId((current) => (current === outboundPackage.id ? null : outboundPackage.id))}
                  outboundPackage={outboundPackage}
                />
              ))}
            </div>
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

function PackageQueueRow({ outboundPackage, expanded, onToggle }: { outboundPackage: OutboundPackage; expanded: boolean; onToggle: () => void }) {
  const primaryRecipient = outboundPackage.recipients[0];
  const unresolvedValidations = getUnresolvedValidations(outboundPackage);
  const highestValidation = getHighestValidation(unresolvedValidations);

  return (
    <div className="package-queue-rowgroup" role="rowgroup">
      <div className="package-queue-row package-queue-grid" role="row">
        <div className="package-queue-cell min-w-0" role="cell">
          <div className="flex min-w-0 gap-2">
            <Button
              aria-controls={`package-details-${outboundPackage.id}`}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} details for ${outboundPackage.title}`}
              className="mt-0.5 size-7 shrink-0"
              onClick={onToggle}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", expanded ? "rotate-180" : null)} />
            </Button>
            <PackageMatterSummary outboundPackage={outboundPackage} />
          </div>
        </div>
        <div className="package-queue-cell min-w-0" role="cell">
          <RecipientSummary recipient={primaryRecipient} />
        </div>
        <div className="package-queue-cell min-w-0" role="cell">
          <AmountDeadlineSummary outboundPackage={outboundPackage} />
        </div>
        <div className="package-queue-cell min-w-0" role="cell">
          <StatusSummary highestValidation={highestValidation} outboundPackage={outboundPackage} unresolvedCount={unresolvedValidations.length} />
          <div className="package-queue-status-action mt-3">
            <PackagePrimaryAction outboundPackage={outboundPackage} />
          </div>
        </div>
        <div className="package-queue-cell package-queue-action-cell min-w-0" role="cell">
          <PackagePrimaryAction outboundPackage={outboundPackage} />
        </div>
      </div>
      {expanded ? (
        <div className="package-queue-details" id={`package-details-${outboundPackage.id}`} role="row">
          <div className="package-queue-details-cell" role="cell">
            <PackageDetails outboundPackage={outboundPackage} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PackageQueueCard({ outboundPackage, expanded, onToggle }: { outboundPackage: OutboundPackage; expanded: boolean; onToggle: () => void }) {
  const primaryRecipient = outboundPackage.recipients[0];
  const unresolvedValidations = getUnresolvedValidations(outboundPackage);
  const highestValidation = getHighestValidation(unresolvedValidations);

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <PackageMatterSummary outboundPackage={outboundPackage} />
        <Button
          aria-controls={`package-card-details-${outboundPackage.id}`}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} details for ${outboundPackage.title}`}
          className="size-8 shrink-0"
          onClick={onToggle}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", expanded ? "rotate-180" : null)} />
        </Button>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-muted-foreground">Recipient</p>
          <RecipientSummary recipient={primaryRecipient} />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground">Amount &amp; deadline</p>
          <AmountDeadlineSummary outboundPackage={outboundPackage} />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground">Status</p>
          <StatusSummary highestValidation={highestValidation} outboundPackage={outboundPackage} unresolvedCount={unresolvedValidations.length} />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground">Action</p>
          <div className="mt-1">
            <PackagePrimaryAction outboundPackage={outboundPackage} />
          </div>
        </div>
      </div>
      {expanded ? (
        <div className="mt-4 border-t border-border pt-4" id={`package-card-details-${outboundPackage.id}`}>
          <PackageDetails outboundPackage={outboundPackage} />
        </div>
      ) : null}
    </article>
  );
}

function PackageMatterSummary({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  const typeLabel = packageTypeLabels[outboundPackage.packageType];
  const claimAndCarrier = [outboundPackage.claimNumberSnapshot ?? "No claim number", outboundPackage.carrierName].filter(Boolean).join(" · ");
  const packageMeta = [`${outboundPackage.documents.length} attachment${outboundPackage.documents.length === 1 ? "" : "s"}`, typeLabel].join(" · ");

  return (
    <div className="min-w-0">
      <Link className="block truncate font-semibold text-foreground hover:underline" href={packageHref(outboundPackage)} title={outboundPackage.title}>
        {outboundPackage.title}
      </Link>
      <Link className="mt-1 block truncate text-sm font-medium text-foreground hover:underline" href={`/matters/${outboundPackage.matterId}`} title={outboundPackage.matterName}>
        {outboundPackage.matterName}
      </Link>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={claimAndCarrier}>{claimAndCarrier}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={packageMeta}>{packageMeta}</p>
    </div>
  );
}

function RecipientSummary({ recipient }: { recipient: OutboundPackage["recipients"][number] | undefined }) {
  if (!recipient) {
    return <p className="text-sm font-medium text-foreground">No recipient</p>;
  }

  const relationship = recipient.organizationNameSnapshot || recipientRoleLabels[recipient.recipientRole] || "Recipient";
  const warning = getVerificationWarning(recipient.verificationStatus);

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-foreground" title={recipient.recipientNameSnapshot}>{recipient.recipientNameSnapshot}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={relationship}>{relationship}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <VerificationBadge status={recipient.verificationStatus} />
      </div>
      {warning ? <p className="mt-1 text-xs text-[var(--warning)]">{warning}</p> : null}
    </div>
  );
}

function AmountDeadlineSummary({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">
        {outboundPackage.amountDemanded !== null ? <CurrencyDisplay value={outboundPackage.amountDemanded} /> : "Amount not set"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {outboundPackage.responseDeadline ? <DateDisplay prefix="Response due" value={outboundPackage.responseDeadline} /> : "Response deadline not set"}
      </p>
      <p className={cn("mt-1 text-xs font-medium", getDeadlineTone(outboundPackage.responseDeadline))}>
        {formatRelativeDeadline(outboundPackage.responseDeadline)}
      </p>
    </div>
  );
}

function StatusSummary({
  outboundPackage,
  highestValidation,
  unresolvedCount,
}: {
  outboundPackage: OutboundPackage;
  highestValidation: PackageValidation | undefined;
  unresolvedCount: number;
}) {
  return (
    <div className="min-w-0">
      <PackageStatusBadge status={outboundPackage.status} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {highestValidation ? <ValidationSeverityBadge severity={highestValidation.severity} /> : null}
        {unresolvedCount > 0 ? (
          <span className="text-xs font-medium text-muted-foreground">
            {unresolvedCount} warning{unresolvedCount === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No open warnings</span>
        )}
      </div>
    </div>
  );
}

function PackagePrimaryAction({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  const action = getPrimaryAction(outboundPackage);

  return (
    <Button asChild className="w-full justify-center sm:w-auto" size="sm" variant={outboundPackage.status === "approved_for_send" ? "outline" : "default"}>
      <Link href={packageHref(outboundPackage)}>{action}</Link>
    </Button>
  );
}

function PackageDetails({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  const primaryRecipient = outboundPackage.recipients[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <div className="min-w-0 space-y-4">
        <DetailGrid
          items={[
            ["Package type", packageTypeLabels[outboundPackage.packageType]],
            ["Claim number", outboundPackage.claimNumberSnapshot ?? "No claim number"],
            ["Carrier", outboundPackage.carrierName],
            ["Preparer", outboundPackage.createdByName ?? "Unknown preparer"],
            ["Assigned reviewer", outboundPackage.assignedToName ?? "Not assigned"],
            ["Response deadline", outboundPackage.responseDeadline ? <DateDisplay value={outboundPackage.responseDeadline} /> : "Not set"],
            ["Last updated", <DateDisplay value={outboundPackage.updatedAt.slice(0, 10)} key="updated" />],
            ["Payment instructions", outboundPackage.paymentInstructions ?? "Not provided"],
            ["Internal notes", outboundPackage.notes ?? "No internal notes"],
          ]}
        />

        <div>
          <h4 className="text-sm font-semibold text-foreground">Attachments</h4>
          {outboundPackage.documents.length > 0 ? (
            <ul className="mt-2 grid gap-2 text-sm text-muted-foreground">
              {outboundPackage.documents.map((document) => (
                <li className="min-w-0 rounded-md border border-border bg-background px-3 py-2" key={document.id}>
                  <p className="truncate font-medium text-foreground" title={document.title}>{document.title}</p>
                  <p className="mt-1 truncate text-xs" title={document.displayFilenameSnapshot}>
                    v{document.documentVersionNumberSnapshot} · {document.displayFilenameSnapshot}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No attachments selected.</p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground">Validation results</h4>
          {outboundPackage.validations.length > 0 ? (
            <ul className="mt-2 grid gap-2 text-sm">
              {outboundPackage.validations.map((validation) => (
                <li className="rounded-md border border-border bg-background px-3 py-2" key={validation.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{validation.title}</span>
                    <span className="text-xs text-muted-foreground">{validationStatusLabels[validation.status]}</span>
                    <span className="text-xs text-muted-foreground">{validationSeverityLabels[validation.severity]}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{validation.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No validation results recorded.</p>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <h4 className="text-sm font-semibold text-foreground">Recipient verification</h4>
          <DetailGrid
            compact
            items={[
              ["Recipient", primaryRecipient?.recipientNameSnapshot ?? "No recipient"],
              ["Email", primaryRecipient?.emailAddress ?? "No email recorded"],
              ["Email source", primaryRecipient ? emailSourceLabels[primaryRecipient.emailSource] : "Not set"],
              ["Verification", primaryRecipient ? verificationStatusLabels[primaryRecipient.verificationStatus] : "Not set"],
              ["Verified by", primaryRecipient?.verifiedByName ?? "Not verified"],
              ["Verified date", primaryRecipient?.verifiedAt ? <DateDisplay value={primaryRecipient.verifiedAt.slice(0, 10)} /> : "Not verified"],
            ]}
          />
        </div>

        <div className="rounded-lg border border-border bg-background p-3">
          <h4 className="text-sm font-semibold text-foreground">Review history</h4>
          {outboundPackage.reviews.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm">
              {outboundPackage.reviews.map((review) => (
                <li className="border-b border-border pb-2 last:border-b-0 last:pb-0" key={review.id}>
                  <p className="font-medium text-foreground">{review.reviewerName ?? "Reviewer"} · {review.decision.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground"><DateDisplay value={review.createdAt.slice(0, 10)} /></p>
                  {review.comments ? <p className="mt-1 text-muted-foreground">{review.comments}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No review history yet.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={packageHref(outboundPackage)}>Open Full Package</Link>
          </Button>
          <PackageSecondaryActions outboundPackage={outboundPackage} />
        </div>
      </div>
    </div>
  );
}

function DetailGrid({ items, compact = false }: { items: Array<[string, ReactNode]>; compact?: boolean }) {
  return (
    <dl className={cn("grid gap-3 text-sm", compact ? "mt-3" : "sm:grid-cols-2")}>
      {items.map(([label, value]) => (
        <div className="min-w-0" key={label}>
          <dt className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PackageSecondaryActions({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  const canSubmit = outboundPackage.status === "draft" || outboundPackage.status === "assembling" || outboundPackage.status === "validation_needed" || outboundPackage.status === "changes_requested";
  const canReview = outboundPackage.status === "ready_for_review";

  return (
    <>
      {canSubmit ? (
        <form action={submitPackageForReviewFormAction}>
          <input name="packageId" type="hidden" value={outboundPackage.id} />
          <Button size="sm" type="submit" variant="outline">Submit for Review</Button>
        </form>
      ) : null}
      {canReview ? (
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
    </>
  );
}

function getPrimaryAction(outboundPackage: OutboundPackage) {
  if (outboundPackage.status === "draft" || outboundPackage.status === "assembling") return "Continue Package";
  if (outboundPackage.status === "validation_needed") return "Resolve Issues";
  if (outboundPackage.status === "changes_requested") return "Review Changes";
  if (outboundPackage.status === "ready_for_review") return "Review";
  if (outboundPackage.status === "approved_for_send") return "View Package";
  return "Open Package";
}

function packageHref(outboundPackage: OutboundPackage) {
  return `/matters/${outboundPackage.matterId}#documents-packages`;
}

function getUnresolvedValidations(outboundPackage: OutboundPackage) {
  return outboundPackage.validations.filter((validation) => validation.status === "failed" || validation.status === "warning");
}

function getHighestValidation(validations: PackageValidation[]) {
  return [...validations].sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0];
}

function getVerificationWarning(status: OutboundPackage["recipients"][number]["verificationStatus"]) {
  if (status === "verification_required") return "Verification required before approval.";
  if (status === "unverified") return "Recipient is unverified.";
  if (status === "outdated") return "Verification is outdated.";
  if (status === "rejected") return "Verification was rejected.";
  return null;
}

function getDeadlineTone(value: string | null) {
  const days = daysUntil(value);
  if (days === null) return "text-muted-foreground";
  if (days < 0) return "text-[var(--urgent)]";
  if (days <= 7) return "text-[var(--warning)]";
  return "text-muted-foreground";
}

function formatRelativeDeadline(value: string | null) {
  const days = daysUntil(value);
  if (days === null) return "No response date";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "1 day remaining";
  return `${days} days remaining`;
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const target = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}
