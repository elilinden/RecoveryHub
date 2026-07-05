import { developmentMatterItems, getDevelopmentMatterDetail } from "@/lib/matters-workspace/mock";
import type { Profile } from "@/lib/data/profiles";
import type {
  DocumentTemplate,
  MatterDocument,
  OutboundPackage,
  PackageReview,
  PackageWorkspaceQuery,
} from "@/lib/documents-packages/types";
import { canApprovePackageForSend, validateOutboundPackage } from "@/lib/documents-packages/validation";

const baseDate = "2026-07-03T14:30:00.000Z";

export const developmentDocuments: MatterDocument[] = [
  {
    id: "doc-northstar-demand-v1",
    matterId: "northstar-collins-claim",
    title: "Initial demand letter",
    documentType: "demand_letter",
    description: "Generated from the approved standard auto subrogation demand template.",
    documentDate: "2026-07-02",
    sourceType: "generated_from_template",
    sourceLabel: "Recovery Hub template",
    storageProvider: "supabase",
    storagePath: "northstar-collins-claim/2026-07-02/fictional-demand-v1.pdf",
    externalUrl: null,
    originalFilename: "demand-letter-v1.pdf",
    displayFilename: "Northstar demand letter v1.pdf",
    mimeType: "application/pdf",
    fileExtension: "pdf",
    fileSizeBytes: 212_480,
    fileHash: "fictional-hash-demand-v1",
    pageCount: 4,
    status: "superseded",
    scanStatus: "not_scanned",
    visibility: "package_eligible",
    versionGroupId: "doc-group-northstar-demand",
    versionNumber: 1,
    supersedesDocumentId: null,
    uploadedByName: "Eli Linden",
    evidenceLinks: [],
    createdAt: "2026-07-02T12:00:00.000Z",
    updatedAt: "2026-07-02T12:00:00.000Z",
    archivedAt: null,
  },
  {
    id: "doc-northstar-demand-v2",
    matterId: "northstar-collins-claim",
    title: "Initial demand letter",
    documentType: "demand_letter",
    description: "Attorney-reviewed demand letter ready for package review.",
    documentDate: "2026-07-03",
    sourceType: "generated_from_template",
    sourceLabel: "Recovery Hub template",
    storageProvider: "supabase",
    storagePath: "northstar-collins-claim/2026-07-03/fictional-demand-v2.pdf",
    externalUrl: null,
    originalFilename: "demand-letter-v2.pdf",
    displayFilename: "Northstar demand letter v2.pdf",
    mimeType: "application/pdf",
    fileExtension: "pdf",
    fileSizeBytes: 218_112,
    fileHash: "fictional-hash-demand-v2",
    pageCount: 4,
    status: "available",
    scanStatus: "not_scanned",
    visibility: "package_eligible",
    versionGroupId: "doc-group-northstar-demand",
    versionNumber: 2,
    supersedesDocumentId: "doc-northstar-demand-v1",
    uploadedByName: "Eli Linden",
    evidenceLinks: [],
    createdAt: baseDate,
    updatedAt: baseDate,
    archivedAt: null,
  },
  {
    id: "doc-northstar-ledger",
    matterId: "northstar-collins-claim",
    title: "Carrier payment ledger",
    documentType: "payment_ledger",
    description: "Fictional payment ledger supporting amount paid.",
    documentDate: "2026-06-25",
    sourceType: "uploaded",
    sourceLabel: "Uploaded file",
    storageProvider: "supabase",
    storagePath: "northstar-collins-claim/2026-06-25/fictional-ledger.pdf",
    externalUrl: null,
    originalFilename: "Northstar Mutual Payment Ledger.pdf",
    displayFilename: "Payment ledger.pdf",
    mimeType: "application/pdf",
    fileExtension: "pdf",
    fileSizeBytes: 884_120,
    fileHash: "fictional-hash-ledger",
    pageCount: 8,
    status: "available",
    scanStatus: "not_scanned",
    visibility: "package_eligible",
    versionGroupId: "doc-group-northstar-ledger",
    versionNumber: 1,
    supersedesDocumentId: null,
    uploadedByName: "Nora Chen",
    evidenceLinks: [{ evidenceItemId: "northstar-collins-claim-evidence-ledger", evidenceType: "payment_ledger", status: "received" }],
    createdAt: "2026-06-25T15:20:00.000Z",
    updatedAt: "2026-06-25T15:20:00.000Z",
    archivedAt: null,
  },
  {
    id: "doc-northstar-photos",
    matterId: "northstar-collins-claim",
    title: "Scene photographs",
    documentType: "photograph",
    description: "Fictional scene photograph set received from carrier.",
    documentDate: "2026-06-29",
    sourceType: "uploaded",
    sourceLabel: "Uploaded file",
    storageProvider: "supabase",
    storagePath: "northstar-collins-claim/2026-06-29/fictional-photos.zip",
    externalUrl: null,
    originalFilename: "Scene Photos.png",
    displayFilename: "Scene photographs.png",
    mimeType: "image/png",
    fileExtension: "png",
    fileSizeBytes: 1_512_880,
    fileHash: "fictional-hash-photos",
    pageCount: null,
    status: "available",
    scanStatus: "not_scanned",
    visibility: "package_eligible",
    versionGroupId: "doc-group-northstar-photos",
    versionNumber: 1,
    supersedesDocumentId: null,
    uploadedByName: "Nora Chen",
    evidenceLinks: [{ evidenceItemId: "northstar-collins-claim-evidence-photos", evidenceType: "photographs", status: "received" }],
    createdAt: "2026-06-29T16:35:00.000Z",
    updatedAt: "2026-06-29T16:35:00.000Z",
    archivedAt: null,
  },
  {
    id: "doc-northstar-external-report",
    matterId: "northstar-collins-claim",
    title: "External incident report",
    documentType: "police_or_incident_report",
    description: "Link to an approved fictional document management system record.",
    documentDate: "2026-06-24",
    sourceType: "external_link",
    sourceLabel: "Approved DMS",
    storageProvider: "external",
    storagePath: null,
    externalUrl: "https://documents.example.com/recovery-hub/incident-report-8841",
    originalFilename: null,
    displayFilename: "External incident report",
    mimeType: null,
    fileExtension: null,
    fileSizeBytes: null,
    fileHash: null,
    pageCount: null,
    status: "available",
    scanStatus: "not_scanned",
    visibility: "package_eligible",
    versionGroupId: "doc-group-northstar-external-report",
    versionNumber: 1,
    supersedesDocumentId: null,
    uploadedByName: "Eli Linden",
    evidenceLinks: [{ evidenceItemId: "northstar-collins-claim-evidence-report", evidenceType: "police_or_incident_report", status: "received" }],
    createdAt: "2026-06-24T11:10:00.000Z",
    updatedAt: "2026-06-24T11:10:00.000Z",
    archivedAt: null,
  },
  {
    id: "doc-harbor-medical-restricted",
    matterId: "harbor-bend-storage-loss",
    title: "Medical record excerpt",
    documentType: "medical_record",
    description: "Restricted fictional medical record excerpt for attorney review only.",
    documentDate: "2026-06-18",
    sourceType: "uploaded",
    sourceLabel: "Uploaded file",
    storageProvider: "supabase",
    storagePath: "harbor-bend-storage-loss/2026-06-18/fictional-medical.pdf",
    externalUrl: null,
    originalFilename: "medical-record-excerpt.pdf",
    displayFilename: "Medical record excerpt.pdf",
    mimeType: "application/pdf",
    fileExtension: "pdf",
    fileSizeBytes: 1_904_331,
    fileHash: "fictional-hash-medical",
    pageCount: 12,
    status: "available",
    scanStatus: "not_scanned",
    visibility: "restricted",
    versionGroupId: "doc-group-harbor-medical",
    versionNumber: 1,
    supersedesDocumentId: null,
    uploadedByName: "Amara Ross",
    evidenceLinks: [],
    createdAt: "2026-06-18T09:15:00.000Z",
    updatedAt: "2026-06-18T09:15:00.000Z",
    archivedAt: null,
  },
  {
    id: "doc-lakeview-quarantined",
    matterId: "lakeview-delivery-collision",
    title: "Flagged image archive",
    documentType: "photograph",
    description: "Development record showing quarantined file behavior.",
    documentDate: "2026-06-20",
    sourceType: "uploaded",
    sourceLabel: "Uploaded file",
    storageProvider: "supabase",
    storagePath: "lakeview-delivery-collision/2026-06-20/fictional-flagged.png",
    externalUrl: null,
    originalFilename: "flagged-image.png",
    displayFilename: "Flagged image archive.png",
    mimeType: "image/png",
    fileExtension: "png",
    fileSizeBytes: 402_144,
    fileHash: "fictional-hash-flagged",
    pageCount: null,
    status: "quarantined",
    scanStatus: "flagged",
    visibility: "internal_only",
    versionGroupId: "doc-group-lakeview-flagged",
    versionNumber: 1,
    supersedesDocumentId: null,
    uploadedByName: "Nora Chen",
    evidenceLinks: [],
    createdAt: "2026-06-20T10:10:00.000Z",
    updatedAt: "2026-06-20T10:10:00.000Z",
    archivedAt: null,
  },
];

export const developmentTemplates: DocumentTemplate[] = [
  {
    id: "template-auto-demand",
    name: "Standard auto subrogation demand",
    templateType: "subrogation_demand",
    matterType: "auto_subrogation",
    description: "Approved non-AI template for ordinary auto subrogation demand packages.",
    isActive: true,
    createdAt: "2026-06-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    versions: [
      {
        id: "template-auto-demand-v1",
        templateId: "template-auto-demand",
        versionNumber: 1,
        name: "Legacy standard demand",
        subjectTemplate: "Demand for reimbursement - {{carrier_claim_number}}",
        bodyTemplate: "Please review the enclosed demand for {{amount_demanded}} regarding {{matter_name}}.",
        footerTemplate: "Recovery Hub development template. Do not send without review.",
        mergeFieldSchema: { required: ["matter_name", "carrier_claim_number", "amount_demanded", "response_deadline"], optional: ["assigned_attorney"] },
        status: "retired",
        approvedByName: "Mara Voss",
        approvedAt: "2026-06-01T12:00:00.000Z",
        createdAt: "2026-06-01T12:00:00.000Z",
      },
      {
        id: "template-auto-demand-v2",
        templateId: "template-auto-demand",
        versionNumber: 2,
        name: "Approved standard demand",
        subjectTemplate: "Demand for reimbursement - {{carrier_claim_number}}",
        bodyTemplate: "Recovery Hub has prepared a reimbursement demand for {{matter_name}}. The amount demanded is {{amount_demanded}} with a requested response by {{response_deadline}}.",
        footerTemplate: "Prepared for internal review. No delivery occurs from this module.",
        mergeFieldSchema: { required: ["matter_name", "carrier_claim_number", "amount_demanded", "response_deadline", "payment_instructions"], optional: ["assigned_attorney", "statute_deadline"] },
        status: "approved",
        approvedByName: "Mara Voss",
        approvedAt: "2026-07-01T12:00:00.000Z",
        createdAt: "2026-07-01T12:00:00.000Z",
      },
    ],
  },
];

const reviews: PackageReview[] = [
  {
    id: "review-northstar-changes",
    reviewerName: "Eli Linden",
    reviewType: "attorney_review",
    decision: "changes_requested",
    comments: "Confirm recipient email and attach updated demand letter version.",
    createdAt: "2026-07-02T17:20:00.000Z",
  },
];

export const developmentPackages: OutboundPackage[] = [
  createPackage({
    id: "pkg-northstar-ready",
    matterId: "northstar-collins-claim",
    status: "ready_for_review",
    title: "Initial demand package",
    recipientVerification: "verified",
    email: "claims-review@example.com",
    documentIds: ["doc-northstar-demand-v2", "doc-northstar-ledger", "doc-northstar-photos", "doc-northstar-external-report"],
  }),
  createPackage({
    id: "pkg-northstar-validation",
    matterId: "northstar-collins-claim",
    status: "validation_needed",
    title: "Draft demand missing payment proof",
    recipientVerification: "unverified",
    email: "new-adjuster@example.com",
    documentIds: ["doc-northstar-demand-v1"],
  }),
  createPackage({
    id: "pkg-harbor-changes",
    matterId: "harbor-bend-storage-loss",
    status: "changes_requested",
    title: "Supplemental reimbursement request",
    recipientVerification: "verification_required",
    email: "harbor-review@example.com",
    documentIds: ["doc-harbor-medical-restricted"],
    reviews,
  }),
  createPackage({
    id: "pkg-lakeview-approved",
    matterId: "lakeview-delivery-collision",
    status: "validation_needed",
    title: "Approved follow-up package",
    recipientVerification: "verified",
    email: "recovery-desk@example.com",
    documentIds: [],
    approvedAt: "2026-07-02T19:00:00.000Z",
  }),
  createPackage({
    id: "pkg-cedar-draft",
    matterId: "cedar-ridge-water-damage",
    status: "draft",
    title: "Document request package",
    recipientVerification: "unverified",
    email: null,
    documentIds: [],
  }),
];

export function listDevelopmentMatterDocuments(matterId: string) {
  return developmentDocuments
    .filter((document) => document.matterId === matterId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listDevelopmentMatterPackages(matterId: string) {
  return developmentPackages
    .filter((outboundPackage) => outboundPackage.matterId === matterId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listDevelopmentPackages(query: PackageWorkspaceQuery) {
  let packages = [...developmentPackages];
  const viewCounts = getPackageViewCounts(packages);
  if (query.view) packages = packages.filter((item) => packageMatchesView(item, query.view));
  if (query.status) packages = packages.filter((item) => item.status === query.status);
  if (query.packageType) packages = packages.filter((item) => item.packageType === query.packageType);
  if (query.verification) packages = packages.filter((item) => item.recipients.some((recipient) => recipient.verificationStatus === query.verification));
  if (query.q) {
    const q = query.q.toLowerCase();
    packages = packages.filter((item) =>
      [item.title, item.matterName, item.claimNumberSnapshot, item.carrierName, item.recipients[0]?.recipientNameSnapshot, item.recipients[0]?.emailAddress]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }
  packages = sortPackages(packages, query.sort);
  const from = (query.page - 1) * query.pageSize;
  const pageItems = packages.slice(from, from + query.pageSize);
  return {
    packages: pageItems,
    query,
    totalCount: packages.length,
    rangeStart: pageItems.length === 0 ? 0 : from + 1,
    rangeEnd: from + pageItems.length,
    viewCounts,
  };
}

function getPackageViewCounts(packages: OutboundPackage[]) {
  return {
    "my-drafts": packages.filter((item) => packageMatchesView(item, "my-drafts")).length,
    "needs-validation": packages.filter((item) => packageMatchesView(item, "needs-validation")).length,
    "ready-for-review": packages.filter((item) => packageMatchesView(item, "ready-for-review")).length,
    "changes-requested": packages.filter((item) => packageMatchesView(item, "changes-requested")).length,
    "approved-for-send": packages.filter((item) => packageMatchesView(item, "approved-for-send")).length,
    "unverified-recipients": packages.filter((item) => packageMatchesView(item, "unverified-recipients")).length,
    "missing-attachments": packages.filter((item) => packageMatchesView(item, "missing-attachments")).length,
    "upcoming-deadlines": packages.filter((item) => packageMatchesView(item, "upcoming-deadlines")).length,
  };
}

function packageMatchesView(item: OutboundPackage, view: string) {
  if (view === "my-drafts") return item.status === "draft" || item.status === "assembling";
  if (view === "needs-validation") return item.status === "validation_needed" || !canApprovePackageForSend(item);
  if (view === "ready-for-review") return item.status === "ready_for_review" && canApprovePackageForSend(item);
  if (view === "changes-requested") return item.status === "changes_requested";
  if (view === "approved-for-send") return item.status === "approved_for_send" && canApprovePackageForSend(item);
  if (view === "unverified-recipients") return item.recipients.length === 0 || item.recipients.some((recipient) => recipient.verificationStatus !== "verified");
  if (view === "missing-attachments") return item.documents.length === 0 || item.validations.some((validation) => ["attachments_present", "cover_document_exists", "payment_proof_included"].includes(validation.validationKey) && validation.status === "failed");
  if (view === "upcoming-deadlines") return Boolean(item.responseDeadline);
  return true;
}

function createPackage(input: {
  id: string;
  matterId: string;
  status: OutboundPackage["status"];
  title: string;
  recipientVerification: "unverified" | "verification_required" | "verified";
  email: string | null;
  documentIds: string[];
  reviews?: PackageReview[];
  approvedAt?: string;
}): OutboundPackage {
  const matter = developmentMatterItems.find((item) => item.id === input.matterId) ?? developmentMatterItems[0];
  const documents = input.documentIds
    .map((documentId, index) => {
      const document = developmentDocuments.find((item) => item.id === documentId);
      if (!document) return null;
      return {
        id: `${input.id}-document-${index + 1}`,
        documentId: document.id,
        title: document.title,
        documentVersionNumberSnapshot: document.versionNumber,
        displayFilenameSnapshot: document.displayFilename,
        documentTypeSnapshot: document.documentType,
        scanStatus: document.scanStatus,
        visibility: document.visibility,
        status: document.status,
        sortOrder: index + 1,
        isRequired: index < 2,
      };
    })
    .filter((document): document is OutboundPackage["documents"][number] => Boolean(document));
  const pkg: OutboundPackage = {
    id: input.id,
    matterId: input.matterId,
    matterName: matter.matterName,
    carrierName: matter.carrierName,
    packageType: input.title.toLowerCase().includes("supplemental") ? "supplemental_demand" : "initial_demand",
    status: input.status,
    title: input.title,
    subjectLine: `Demand for reimbursement - ${matter.carrierClaimNumber ?? "claim pending"}`,
    coverDocumentId: documents.find((document) => document.documentTypeSnapshot === "demand_letter")?.documentId ?? null,
    templateVersionId: "template-auto-demand-v2",
    templateVersionStatus: "approved",
    amountDemanded: matter.amountSought,
    responseDeadline: "2026-07-24",
    paymentInstructions: input.status === "validation_needed" ? "" : "Payment instructions will be confirmed before sending.",
    claimNumberSnapshot: matter.carrierClaimNumber,
    insuredNameSnapshot: matter.primaryPartyNames[0] ?? "Taylor Reed",
    responsiblePartySnapshot: "Jordan Collins",
    carrierNameSnapshot: matter.carrierName,
    matterAmountSoughtSnapshot: matter.amountSought,
    notes: "Fictional development package for local preview only.",
    assignedToName: matter.assignedFirmUser,
    createdByName: "Nora Chen",
    submittedForReviewAt: input.status === "ready_for_review" || input.status === "approved_for_send" ? "2026-07-03T15:00:00.000Z" : null,
    approvedByName: input.approvedAt ? "Eli Linden" : null,
    approvedAt: input.approvedAt ?? null,
    canceledAt: null,
    createdAt: "2026-07-02T14:00:00.000Z",
    updatedAt: input.approvedAt ?? baseDate,
    recipients: [
      {
        id: `${input.id}-recipient`,
        recipientNameSnapshot: "Fictional Claims Desk",
        organizationNameSnapshot: "Example Recovery Services",
        emailAddress: input.email,
        emailSource: input.email ? "user_entered" : "unknown",
        recipientRole: "claims_administrator",
        relationshipToMatter: input.email ? "Adverse claims contact for this fictional matter" : null,
        verificationStatus: input.recipientVerification,
        verifiedByName: input.recipientVerification === "verified" ? "Eli Linden" : null,
        verifiedAt: input.recipientVerification === "verified" ? "2026-07-03T14:00:00.000Z" : null,
        verificationNote: input.recipientVerification === "verified" ? "Verified against fictional carrier directory." : null,
        isPrimary: true,
      },
    ],
    documents,
    validations: [],
    reviews: input.reviews ?? [],
  };
  const detail = getDevelopmentMatterDetail(input.matterId, {
    id: "development-profile",
    email: "eli.linden@example.test",
    full_name: "Eli Linden",
    role: "attorney",
    job_title: "Attorney",
    avatar_url: null,
    is_active: true,
  } satisfies Profile);
  pkg.validations = detail ? validateOutboundPackage({ matter: detail, outboundPackage: pkg, now: new Date("2026-07-03T12:00:00.000Z") }) : [];
  return pkg;
}

function sortPackages(packages: OutboundPackage[], sort: PackageWorkspaceQuery["sort"]) {
  const sorted = [...packages];
  if (sort === "response_deadline") return sorted.sort((a, b) => (a.responseDeadline ?? "9999").localeCompare(b.responseDeadline ?? "9999"));
  if (sort === "amount_demanded") return sorted.sort((a, b) => (b.amountDemanded ?? 0) - (a.amountDemanded ?? 0));
  if (sort === "carrier") return sorted.sort((a, b) => a.carrierName.localeCompare(b.carrierName));
  if (sort === "package_type") return sorted.sort((a, b) => a.packageType.localeCompare(b.packageType));
  if (sort === "awaiting_review") return sorted.sort((a, b) => (a.submittedForReviewAt ?? "9999").localeCompare(b.submittedForReviewAt ?? "9999"));
  return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
