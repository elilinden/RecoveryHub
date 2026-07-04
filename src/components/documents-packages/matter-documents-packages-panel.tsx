import Link from "next/link";
import { ExternalLink, FileText, PackagePlus } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { submitCreateExternalDocumentLinkAction, submitCreatePackageAction } from "@/lib/documents-packages/actions";
import {
  documentTypeLabels,
  packageTypeLabels,
  sourceTypeLabels,
} from "@/lib/documents-packages/labels";
import type { DocumentPackagePermissions, DocumentTemplate, MatterDocument, OutboundPackage } from "@/lib/documents-packages/types";
import type { EvidenceItem } from "@/lib/matters-workspace/types";
import { canPreviewDocument } from "@/lib/documents-packages/storage";
import { DocumentStatusBadge, PackageStatusBadge, ScanStatusBadge, VerificationBadge, VisibilityBadge } from "@/components/documents-packages/document-package-badges";
import { DocumentUploadPanel } from "@/components/documents-packages/document-upload-panel";

type MatterDocumentsPackagesPanelProps = {
  matterId: string;
  matterAmountSought: number;
  documents: MatterDocument[];
  packages: OutboundPackage[];
  templates: DocumentTemplate[];
  evidence: EvidenceItem[];
  permissions: DocumentPackagePermissions;
};

export function MatterDocumentsPackagesPanel({
  matterId,
  matterAmountSought,
  documents,
  packages,
  templates,
  evidence,
  permissions,
}: MatterDocumentsPackagesPanelProps) {
  return (
    <Tabs className="space-y-4" defaultValue="documents">
      <TabsList className="min-h-11 w-full flex-wrap items-stretch justify-start gap-1 rounded-lg border border-border bg-card p-1 [&_[data-slot=tabs-trigger]]:flex-none [&_[data-slot=tabs-trigger]]:px-3">
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="packages">Packages</TabsTrigger>
      </TabsList>

      <TabsContent value="documents">
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <SectionHeader
                  title="Document Library"
                />
              </div>
              {permissions.canUploadDocuments ? <DocumentUploadPanel evidence={evidence} matterId={matterId} /> : null}
              <ExternalDocumentForm matterId={matterId} />
            </CardContent>
          </Card>

          {documents.length === 0 ? (
            <EmptyState description="Upload or link the first document for this matter." title="No documents have been added" />
          ) : (
            <div className="document-list rounded-lg border border-border bg-card shadow-sm">
              <div className="document-list-desktop" role="table" aria-label="Matter documents">
                <div className="document-list-header document-list-grid" role="row">
                  <div role="columnheader">Document</div>
                  <div role="columnheader">Date &amp; Version</div>
                  <div role="columnheader">Scan</div>
                  <div role="columnheader">Visibility</div>
                  <div role="columnheader">Actions</div>
                </div>
                <div role="rowgroup">
                  {documents.map((document) => (
                    <DocumentRow document={document} key={document.id} />
                  ))}
                </div>
              </div>
              <div className="document-list-mobile gap-3 p-3">
                {documents.map((document) => <DocumentCard document={document} key={document.id} />)}
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="packages">
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <SectionHeader
                description="Create and validate outgoing packages for later review and delivery. This phase never sends email."
                title="Outbound Packages"
              />
              {permissions.canBuildPackages ? <CreatePackageForm matterAmountSought={matterAmountSought} matterId={matterId} templates={templates} /> : null}
            </CardContent>
          </Card>
          {packages.length === 0 ? (
            <EmptyState description="Create a package when the matter is ready for a demand, request, or notice." title="No outbound packages have been created" />
          ) : (
            <div className="document-list rounded-lg border border-border bg-card shadow-sm">
              <div className="document-list-desktop" role="table" aria-label="Matter packages">
                <div className="document-list-header matter-package-list-grid" role="row">
                  <div role="columnheader">Package</div>
                  <div role="columnheader">Recipient &amp; Status</div>
                  <div role="columnheader">Amount &amp; Deadline</div>
                  <div role="columnheader">Updated</div>
                </div>
                <div role="rowgroup">
                  {packages.map((outboundPackage) => (
                    <PackageRow outboundPackage={outboundPackage} key={outboundPackage.id} />
                  ))}
                </div>
              </div>
              <div className="document-list-mobile gap-3 p-3">
                {packages.map((outboundPackage) => <PackageCard outboundPackage={outboundPackage} key={outboundPackage.id} />)}
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function ExternalDocumentForm({ matterId }: { matterId: string }) {
  return (
    <details className="rounded-lg border border-border bg-background p-4">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">Link externally managed document</summary>
      <form action={submitCreateExternalDocumentLinkAction} className="mt-4 grid gap-3 lg:grid-cols-2">
        <input name="matterId" type="hidden" value={matterId} />
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>Title</span>
          <input className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="title" required />
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>Document type</span>
          <select className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="documentType" defaultValue="other">
            {Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>External URL</span>
          <input className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="externalUrl" placeholder="https://documents.example.com/..." required type="url" />
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>Source system</span>
          <input className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="sourceSystem" defaultValue="Approved DMS" required />
        </label>
        <input name="visibility" type="hidden" value="package_eligible" />
        <input name="documentDate" type="hidden" value="" />
        <input name="description" type="hidden" value="Externally managed document link." />
        <Button className="lg:col-span-2" type="submit" variant="outline">Create external link</Button>
      </form>
    </details>
  );
}

function CreatePackageForm({ matterId, matterAmountSought, templates }: { matterId: string; matterAmountSought: number; templates: DocumentTemplate[] }) {
  const hasApprovedTemplate = templates.some((template) => template.versions.some((version) => version.status === "approved"));
  return (
    <form action={submitCreatePackageAction} className="grid gap-3 rounded-lg border border-border bg-background p-4 lg:grid-cols-2">
      <input name="matterId" type="hidden" value={matterId} />
      <label className="space-y-1 text-sm font-medium text-foreground">
        <span>Package type</span>
        <select className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="packageType" defaultValue="initial_demand">
          {Object.entries(packageTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm font-medium text-foreground">
        <span>Package title</span>
        <input className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="title" defaultValue="Initial demand package" required />
      </label>
      <label className="space-y-1 text-sm font-medium text-foreground">
        <span>Amount demanded</span>
        <input className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" inputMode="decimal" name="amountDemanded" defaultValue={String(matterAmountSought)} required />
      </label>
      <label className="space-y-1 text-sm font-medium text-foreground">
        <span>Response deadline</span>
        <input className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" name="responseDeadline" type="date" />
      </label>
      <label className="space-y-1 text-sm font-medium text-foreground lg:col-span-2">
        <span>Payment instructions</span>
        <textarea className="min-h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" name="paymentInstructions" />
      </label>
      <input name="notes" type="hidden" value="Prepared in Phase 5A package builder." />
      {!hasApprovedTemplate ? (
        <p className="rounded-lg border border-[color:var(--warning)]/20 bg-[var(--warning-muted)] px-3 py-2 text-sm text-[var(--warning)] lg:col-span-2">
          No approved template is available. An authorized user must approve a template before final approval.
        </p>
      ) : null}
      <Button className="gap-2 lg:col-span-2" type="submit">
        <PackagePlus aria-hidden="true" className="size-4" />
        Create package
      </Button>
    </form>
  );
}

function DocumentRow({ document }: { document: MatterDocument }) {
  return (
    <div className="document-list-row document-list-grid" role="row">
      <div className="document-list-cell min-w-0" role="cell">
        <p className="truncate font-medium text-foreground" title={document.title}>{document.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground" title={document.displayFilename}>{document.displayFilename}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={`${documentTypeLabels[document.documentType]} · ${sourceTypeLabels[document.sourceType]}`}>
          {documentTypeLabels[document.documentType]} · {sourceTypeLabels[document.sourceType]}
        </p>
      </div>
      <div className="document-list-cell min-w-0 text-sm" role="cell">
        <p className="font-medium text-foreground">{document.documentDate ? <DateDisplay value={document.documentDate} /> : "Not dated"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Version {document.versionNumber}</p>
      </div>
      <div className="document-list-cell min-w-0" role="cell">
        <ScanStatusBadge status={document.scanStatus} />
      </div>
      <div className="document-list-cell min-w-0" role="cell">
        <VisibilityBadge visibility={document.visibility} />
      </div>
      <div className="document-list-cell min-w-0" role="cell">
        <DocumentActions document={document} />
      </div>
    </div>
  );
}

function DocumentActions({ document }: { document: MatterDocument }) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      <Button asChild disabled={!canPreviewDocument(document)} size="sm" variant="outline">
        <a href={`/api/documents/${document.id}/download`} rel="noreferrer" target="_blank">Preview</a>
      </Button>
      <Button asChild disabled={document.status === "quarantined" || document.scanStatus === "flagged"} size="sm" variant="outline">
        <a href={`/api/documents/${document.id}/download`} rel="noreferrer" target="_blank">
          {document.externalUrl ? <ExternalLink aria-hidden="true" className="size-4" /> : null}
          {document.externalUrl ? "Open" : "Download"}
        </a>
      </Button>
    </div>
  );
}

function DocumentCard({ document }: { document: MatterDocument }) {
  return (
    <Card className="min-w-0 border-border bg-card shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground" title={document.title}>{document.title}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground" title={document.displayFilename}>{document.displayFilename}</p>
          </div>
          <FileText aria-hidden="true" className="size-5 shrink-0 text-primary" />
        </div>
        <div className="flex flex-wrap gap-2">
          <DocumentStatusBadge status={document.status} />
          <ScanStatusBadge status={document.scanStatus} />
          <VisibilityBadge visibility={document.visibility} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Type</dt><dd className="font-medium text-foreground">{documentTypeLabels[document.documentType]}</dd></div>
          <div><dt className="text-muted-foreground">Version</dt><dd className="font-medium text-foreground">v{document.versionNumber}</dd></div>
          <div><dt className="text-muted-foreground">Date</dt><dd className="font-medium text-foreground">{document.documentDate ? <DateDisplay value={document.documentDate} /> : "Not dated"}</dd></div>
          <div><dt className="text-muted-foreground">Source</dt><dd className="font-medium text-foreground">{sourceTypeLabels[document.sourceType]}</dd></div>
        </dl>
        <DocumentActions document={document} />
      </CardContent>
    </Card>
  );
}

function PackageRow({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  const primaryRecipient = outboundPackage.recipients[0];
  return (
    <div className="document-list-row matter-package-list-grid" role="row">
      <div className="document-list-cell min-w-0" role="cell">
        <p className="truncate font-medium text-foreground" title={outboundPackage.title}>{outboundPackage.title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground" title={packageTypeLabels[outboundPackage.packageType]}>
          {outboundPackage.documents.length} attachment{outboundPackage.documents.length === 1 ? "" : "s"} · {packageTypeLabels[outboundPackage.packageType]}
        </p>
      </div>
      <div className="document-list-cell min-w-0" role="cell">
        <p className="truncate font-medium text-foreground" title={primaryRecipient?.recipientNameSnapshot ?? "No recipient"}>{primaryRecipient?.recipientNameSnapshot ?? "No recipient"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {primaryRecipient ? <VerificationBadge status={primaryRecipient.verificationStatus} /> : null}
          <PackageStatusBadge status={outboundPackage.status} />
        </div>
      </div>
      <div className="document-list-cell min-w-0 text-sm" role="cell">
        <p className="font-medium text-foreground">{outboundPackage.amountDemanded !== null ? <CurrencyDisplay value={outboundPackage.amountDemanded} /> : "Not set"}</p>
        <p className="mt-1 text-xs text-muted-foreground">{outboundPackage.responseDeadline ? <DateDisplay value={outboundPackage.responseDeadline} /> : "No response deadline"}</p>
      </div>
      <div className="document-list-cell min-w-0 text-sm text-muted-foreground" role="cell">
        <DateDisplay value={outboundPackage.updatedAt.slice(0, 10)} />
      </div>
    </div>
  );
}

function PackageCard({ outboundPackage }: { outboundPackage: OutboundPackage }) {
  const primaryRecipient = outboundPackage.recipients[0];
  return (
    <Card className="min-w-0 border-border bg-card shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground" title={outboundPackage.title}>{outboundPackage.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{packageTypeLabels[outboundPackage.packageType]}</p>
          </div>
          <PackageStatusBadge status={outboundPackage.status} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Recipient</dt><dd className="font-medium text-foreground">{primaryRecipient?.recipientNameSnapshot ?? "No recipient"}</dd></div>
          <div><dt className="text-muted-foreground">Email verification</dt><dd>{primaryRecipient ? <VerificationBadge status={primaryRecipient.verificationStatus} /> : "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Amount</dt><dd className="font-medium text-foreground">{outboundPackage.amountDemanded !== null ? <CurrencyDisplay value={outboundPackage.amountDemanded} /> : "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Response deadline</dt><dd className="font-medium text-foreground">{outboundPackage.responseDeadline ? <DateDisplay value={outboundPackage.responseDeadline} /> : "Not set"}</dd></div>
        </dl>
        <Button asChild size="sm" variant="outline">
          <Link href="/packages">Open Packages workspace</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
