import type { Profile } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  DocumentTemplate,
  MatterDocument,
  OutboundPackage,
  PackageWorkspaceResult,
} from "@/lib/documents-packages/types";
import { parsePackageQuery } from "@/lib/documents-packages/query";
import {
  developmentDocuments,
  developmentPackages,
  developmentTemplates,
  listDevelopmentMatterDocuments,
  listDevelopmentMatterPackages,
  listDevelopmentPackages,
} from "@/lib/documents-packages/mock";

type PackageRow = Record<string, unknown>;
type DocumentRow = Record<string, unknown>;
type TemplateRow = Record<string, unknown>;
type RecipientRow = Record<string, unknown>;
type PackageDocumentRow = Record<string, unknown>;
type ValidationRow = Record<string, unknown>;
type ReviewRow = Record<string, unknown>;
type EvidenceDocumentLinkRow = Record<string, unknown>;

type PackageRelations = {
  recipientsByPackage: Map<string, OutboundPackage["recipients"]>;
  documentsByPackage: Map<string, OutboundPackage["documents"]>;
  validationsByPackage: Map<string, OutboundPackage["validations"]>;
  reviewsByPackage: Map<string, OutboundPackage["reviews"]>;
};

export async function loadMatterDocumentsAndPackages(input: {
  matterId: string;
  profile: Profile;
}): Promise<{ documents: MatterDocument[]; packages: OutboundPackage[]; templates: DocumentTemplate[] }> {
  if (!isSupabaseConfigured()) {
    return {
      documents: listDevelopmentMatterDocuments(input.matterId),
      packages: listDevelopmentMatterPackages(input.matterId),
      templates: developmentTemplates,
    };
  }

  const supabase = await createClient();
  const [documents, packages, templates] = await Promise.all([
    supabase.from("matter_documents").select("*").eq("matter_id", input.matterId).order("updated_at", { ascending: false }),
    supabase.from("outbound_packages").select("*").eq("matter_id", input.matterId).order("updated_at", { ascending: false }),
    supabase.from("document_templates").select("*").eq("is_active", true).order("updated_at", { ascending: false }),
  ]);
  const documentRows = (documents.data ?? []) as DocumentRow[];
  const evidenceLinksByDocument = await loadEvidenceLinksForDocuments(documentRows.map((row) => stringValue(row.id)));
  const packageRows = (packages.data ?? []) as PackageRow[];
  const relations = await loadPackageRelations(packageRows.map((row) => stringValue(row.id)));

  return {
    documents: documentRows.map((row) => mapDocumentRow(row, evidenceLinksByDocument.get(stringValue(row.id)) ?? [])),
    packages: packageRows.map((row) => mapPackageRow(row, relations)),
    templates: ((templates.data ?? []) as TemplateRow[]).map(mapTemplateRow),
  };
}

export async function loadPackagesWorkspace(input: {
  profile: Profile;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<PackageWorkspaceResult> {
  const query = parsePackageQuery(input.searchParams);
  if (!isSupabaseConfigured()) {
    return listDevelopmentPackages(query);
  }

  const supabase = await createClient();
  const viewCounts = await loadPackageViewCounts();
  let packageQuery = supabase.from("outbound_packages").select("*", { count: "exact" });
  const viewPackageIds = await loadPackageIdsForRelationshipView(query.view);
  if (query.view === "my-drafts") packageQuery = packageQuery.in("status", ["draft", "assembling"]);
  if (query.view === "needs-validation") packageQuery = packageQuery.eq("status", "validation_needed");
  if (query.view === "ready-for-review") packageQuery = packageQuery.eq("status", "ready_for_review");
  if (query.view === "changes-requested") packageQuery = packageQuery.eq("status", "changes_requested");
  if (query.view === "approved-for-send") packageQuery = packageQuery.eq("status", "approved_for_send");
  if (query.view === "upcoming-deadlines") packageQuery = packageQuery.not("response_deadline", "is", null);
  if (viewPackageIds) packageQuery = viewPackageIds.length > 0 ? packageQuery.in("id", viewPackageIds) : packageQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  if (query.status) packageQuery = packageQuery.eq("status", query.status);
  if (query.packageType) packageQuery = packageQuery.eq("package_type", query.packageType);
  if (query.q) {
    const q = escapeLike(query.q);
    packageQuery = packageQuery.or(`title.ilike.%${q}%,claim_number_snapshot.ilike.%${q}%,carrier_name_snapshot.ilike.%${q}%`);
  }
  if (query.sort === "response_deadline") packageQuery = packageQuery.order("response_deadline", { ascending: true, nullsFirst: false });
  else if (query.sort === "amount_demanded") packageQuery = packageQuery.order("amount_demanded", { ascending: false });
  else if (query.sort === "carrier") packageQuery = packageQuery.order("carrier_name_snapshot", { ascending: true });
  else if (query.sort === "package_type") packageQuery = packageQuery.order("package_type", { ascending: true });
  else packageQuery = packageQuery.order("updated_at", { ascending: false });

  const from = (query.page - 1) * query.pageSize;
  const { data, count } = await packageQuery.range(from, from + query.pageSize - 1);
  const packageRows = (data ?? []) as PackageRow[];
  const relations = await loadPackageRelations(packageRows.map((row) => stringValue(row.id)));
  const packages = packageRows.map((row) => mapPackageRow(row, relations));
  return {
    packages,
    query,
    totalCount: count ?? packages.length,
    rangeStart: packages.length === 0 ? 0 : from + 1,
    rangeEnd: from + packages.length,
    viewCounts,
  };
}

async function loadPackageIdsForRelationshipView(view: string) {
  if (view !== "unverified-recipients" && view !== "missing-attachments") return null;
  const supabase = await createClient();
  if (view === "unverified-recipients") {
    const { data } = await supabase.from("outbound_package_recipients").select("package_id").neq("verification_status", "verified");
    return [...new Set((data ?? []).map((row) => String(row.package_id)))];
  }
  const { data } = await supabase
    .from("outbound_package_validations")
    .select("package_id")
    .eq("status", "failed")
    .in("validation_key", ["attachments_present", "cover_document_exists", "payment_proof_included"]);
  return [...new Set((data ?? []).map((row) => String(row.package_id)))];
}

async function loadPackageViewCounts() {
  const supabase = await createClient();
  const [{ data }, unverifiedIds, missingAttachmentIds] = await Promise.all([
    supabase.from("outbound_packages").select("id,status,response_deadline,cover_document_id"),
    loadPackageIdsForRelationshipView("unverified-recipients"),
    loadPackageIdsForRelationshipView("missing-attachments"),
  ]);
  const packages = ((data ?? []) as PackageRow[]).map((row) => ({
    status: stringValue(row.status) as OutboundPackage["status"],
    coverDocumentId: nullableString(row.cover_document_id),
    responseDeadline: nullableString(row.response_deadline),
    recipients: [],
    documents: [],
    validations: [],
    reviews: [],
  }));

  return {
    "my-drafts": packages.filter((item) => item.status === "draft" || item.status === "assembling").length,
    "needs-validation": packages.filter((item) => item.status === "validation_needed").length,
    "ready-for-review": packages.filter((item) => item.status === "ready_for_review").length,
    "changes-requested": packages.filter((item) => item.status === "changes_requested").length,
    "approved-for-send": packages.filter((item) => item.status === "approved_for_send").length,
    "unverified-recipients": unverifiedIds?.length ?? 0,
    "missing-attachments": missingAttachmentIds?.length ?? 0,
    "upcoming-deadlines": packages.filter((item) => Boolean(item.responseDeadline)).length,
  };
}

export async function loadDocumentTemplates(profile: Profile): Promise<DocumentTemplate[]> {
  void profile;
  if (!isSupabaseConfigured()) return developmentTemplates;
  const supabase = await createClient();
  const { data } = await supabase.from("document_templates").select("*").order("updated_at", { ascending: false });
  return ((data ?? []) as TemplateRow[]).map(mapTemplateRow);
}

export async function getDevelopmentPackageById(id: string) {
  return developmentPackages.find((outboundPackage) => outboundPackage.id === id) ?? null;
}

export async function getDevelopmentDocumentById(id: string) {
  return developmentDocuments.find((document) => document.id === id) ?? null;
}

async function loadPackageRelations(packageIds: string[]): Promise<PackageRelations> {
  if (packageIds.length === 0) {
    return {
      recipientsByPackage: new Map(),
      documentsByPackage: new Map(),
      validationsByPackage: new Map(),
      reviewsByPackage: new Map(),
    };
  }
  const supabase = await createClient();
  const [{ data: recipients }, { data: packageDocuments }, { data: validations }, { data: reviews }] = await Promise.all([
    supabase.from("outbound_package_recipients").select("*").in("package_id", packageIds),
    supabase.from("outbound_package_documents").select("*").in("package_id", packageIds).order("sort_order"),
    supabase.from("outbound_package_validations").select("*").in("package_id", packageIds),
    supabase.from("outbound_package_reviews").select("*").in("package_id", packageIds).order("created_at", { ascending: false }),
  ]);
  const packageDocumentRows = (packageDocuments ?? []) as PackageDocumentRow[];
  const documentIds = [...new Set(packageDocumentRows.map((row) => stringValue(row.document_id)).filter(Boolean))];
  const { data: matterDocuments } = documentIds.length > 0
    ? await supabase.from("matter_documents").select("id,title,status,scan_status,visibility").in("id", documentIds)
    : { data: [] };
  const matterDocumentById = new Map(((matterDocuments ?? []) as DocumentRow[]).map((row) => [stringValue(row.id), row]));

  return {
    recipientsByPackage: groupByMapped((recipients ?? []) as RecipientRow[], (row) => stringValue(row.package_id), mapPackageRecipient),
    documentsByPackage: groupByMapped(packageDocumentRows, (row) => stringValue(row.package_id), (row) => mapPackageDocument(row, matterDocumentById)),
    validationsByPackage: groupByMapped((validations ?? []) as ValidationRow[], (row) => stringValue(row.package_id), mapPackageValidation),
    reviewsByPackage: groupByMapped((reviews ?? []) as ReviewRow[], (row) => stringValue(row.package_id), mapPackageReview),
  };
}

async function loadEvidenceLinksForDocuments(documentIds: string[]) {
  if (documentIds.length === 0) return new Map<string, MatterDocument["evidenceLinks"]>();
  const supabase = await createClient();
  const { data: links } = await supabase.from("evidence_document_links").select("*").in("document_id", documentIds);
  const linkRows = (links ?? []) as EvidenceDocumentLinkRow[];
  const evidenceIds = [...new Set(linkRows.map((row) => stringValue(row.evidence_item_id)).filter(Boolean))];
  const { data: evidenceRows } = evidenceIds.length > 0
    ? await supabase.from("evidence_items").select("id,evidence_type,status").in("id", evidenceIds)
    : { data: [] };
  const evidenceById = new Map(((evidenceRows ?? []) as Array<Record<string, unknown>>).map((row) => [stringValue(row.id), row]));
  const byDocument = new Map<string, MatterDocument["evidenceLinks"]>();

  for (const link of linkRows) {
    const documentId = stringValue(link.document_id);
    const evidenceItemId = stringValue(link.evidence_item_id);
    const evidence = evidenceById.get(evidenceItemId);
    if (!documentId || !evidenceItemId || !evidence) continue;
    const current = byDocument.get(documentId) ?? [];
    current.push({
      evidenceItemId,
      evidenceType: stringValue(evidence.evidence_type),
      status: stringValue(evidence.status),
    });
    byDocument.set(documentId, current);
  }

  return byDocument;
}

function mapDocumentRow(row: DocumentRow, evidenceLinks: MatterDocument["evidenceLinks"] = []): MatterDocument {
  return {
    id: stringValue(row.id),
    matterId: stringValue(row.matter_id),
    title: stringValue(row.title),
    documentType: stringValue(row.document_type) as MatterDocument["documentType"],
    description: nullableString(row.description),
    documentDate: nullableString(row.document_date),
    sourceType: stringValue(row.source_type) as MatterDocument["sourceType"],
    sourceLabel: stringValue(row.source_type).replaceAll("_", " "),
    storageProvider: stringValue(row.storage_provider),
    storagePath: nullableString(row.storage_path),
    externalUrl: nullableString(row.external_url),
    originalFilename: nullableString(row.original_filename),
    displayFilename: stringValue(row.display_filename),
    mimeType: nullableString(row.mime_type),
    fileExtension: nullableString(row.file_extension),
    fileSizeBytes: numberOrNull(row.file_size_bytes),
    fileHash: nullableString(row.file_hash),
    pageCount: numberOrNull(row.page_count),
    status: stringValue(row.status) as MatterDocument["status"],
    scanStatus: stringValue(row.scan_status) as MatterDocument["scanStatus"],
    visibility: stringValue(row.visibility) as MatterDocument["visibility"],
    versionGroupId: stringValue(row.version_group_id),
    versionNumber: numberOrNull(row.version_number) ?? 1,
    supersedesDocumentId: nullableString(row.supersedes_document_id),
    uploadedByName: null,
    evidenceLinks,
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
    archivedAt: nullableString(row.archived_at),
  };
}

function mapPackageRow(row: PackageRow, relations: PackageRelations): OutboundPackage {
  const id = stringValue(row.id);
  return {
    id,
    matterId: stringValue(row.matter_id),
    matterName: nullableString(row.matter_name_snapshot) ?? "Matter",
    carrierName: nullableString(row.carrier_name_snapshot) ?? "Carrier",
    packageType: stringValue(row.package_type) as OutboundPackage["packageType"],
    status: stringValue(row.status) as OutboundPackage["status"],
    title: stringValue(row.title),
    subjectLine: nullableString(row.subject_line),
    coverDocumentId: nullableString(row.cover_document_id),
    templateVersionId: nullableString(row.template_version_id),
    amountDemanded: numberOrNull(row.amount_demanded),
    responseDeadline: nullableString(row.response_deadline),
    paymentInstructions: nullableString(row.payment_instructions),
    claimNumberSnapshot: nullableString(row.claim_number_snapshot),
    insuredNameSnapshot: nullableString(row.insured_name_snapshot),
    responsiblePartySnapshot: nullableString(row.responsible_party_snapshot),
    carrierNameSnapshot: nullableString(row.carrier_name_snapshot),
    matterAmountSoughtSnapshot: numberOrNull(row.matter_amount_sought_snapshot),
    notes: nullableString(row.notes),
    assignedToName: null,
    createdByName: null,
    submittedForReviewAt: nullableString(row.submitted_for_review_at),
    approvedByName: null,
    approvedAt: nullableString(row.approved_at),
    canceledAt: nullableString(row.canceled_at),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
    recipients: relations.recipientsByPackage.get(id) ?? [],
    documents: relations.documentsByPackage.get(id) ?? [],
    validations: relations.validationsByPackage.get(id) ?? [],
    reviews: relations.reviewsByPackage.get(id) ?? [],
  };
}

function mapPackageRecipient(row: RecipientRow): OutboundPackage["recipients"][number] {
  return {
    id: stringValue(row.id),
    recipientNameSnapshot: stringValue(row.recipient_name_snapshot),
    organizationNameSnapshot: nullableString(row.organization_name_snapshot),
    emailAddress: nullableString(row.email_address),
    emailSource: stringValue(row.email_source) as OutboundPackage["recipients"][number]["emailSource"],
    recipientRole: stringValue(row.recipient_role) as OutboundPackage["recipients"][number]["recipientRole"],
    relationshipToMatter: nullableString(row.relationship_to_matter),
    verificationStatus: stringValue(row.verification_status) as OutboundPackage["recipients"][number]["verificationStatus"],
    verifiedByName: null,
    verifiedAt: nullableString(row.verified_at),
    verificationNote: nullableString(row.verification_note),
    isPrimary: Boolean(row.is_primary),
  };
}

function mapPackageDocument(row: PackageDocumentRow, matterDocumentById: Map<string, DocumentRow>): OutboundPackage["documents"][number] {
  const matterDocument = matterDocumentById.get(stringValue(row.document_id));
  return {
    id: stringValue(row.id),
    documentId: stringValue(row.document_id),
    title: nullableString(matterDocument?.title) ?? stringValue(row.display_filename_snapshot),
    documentVersionNumberSnapshot: numberOrNull(row.document_version_number_snapshot) ?? 1,
    displayFilenameSnapshot: stringValue(row.display_filename_snapshot),
    documentTypeSnapshot: stringValue(row.document_type_snapshot) as OutboundPackage["documents"][number]["documentTypeSnapshot"],
    scanStatus: stringValue(matterDocument?.scan_status ?? "not_scanned") as OutboundPackage["documents"][number]["scanStatus"],
    visibility: stringValue(matterDocument?.visibility ?? "package_eligible") as OutboundPackage["documents"][number]["visibility"],
    status: stringValue(matterDocument?.status ?? "available") as OutboundPackage["documents"][number]["status"],
    sortOrder: numberOrNull(row.sort_order) ?? 1,
    isRequired: Boolean(row.is_required),
  };
}

function mapPackageValidation(row: ValidationRow): OutboundPackage["validations"][number] {
  return {
    id: stringValue(row.id),
    validationKey: stringValue(row.validation_key),
    status: stringValue(row.status) as OutboundPackage["validations"][number]["status"],
    severity: stringValue(row.severity) as OutboundPackage["validations"][number]["severity"],
    title: stringValue(row.title),
    description: stringValue(row.description),
    overrideReason: nullableString(row.override_reason),
    resolvedAt: nullableString(row.resolved_at),
  };
}

function mapPackageReview(row: ReviewRow): OutboundPackage["reviews"][number] {
  return {
    id: stringValue(row.id),
    reviewerName: null,
    reviewType: stringValue(row.review_type) as OutboundPackage["reviews"][number]["reviewType"],
    decision: stringValue(row.decision) as OutboundPackage["reviews"][number]["decision"],
    comments: nullableString(row.comments),
    createdAt: stringValue(row.created_at),
  };
}

function mapTemplateRow(row: TemplateRow): DocumentTemplate {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    templateType: stringValue(row.template_type) as DocumentTemplate["templateType"],
    matterType: nullableString(row.matter_type) as DocumentTemplate["matterType"],
    description: nullableString(row.description),
    isActive: Boolean(row.is_active),
    versions: [],
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function groupByMapped<T, U>(items: T[], key: (item: T) => string, map: (item: T) => U) {
  const grouped = new Map<string, U[]>();
  for (const item of items) {
    const groupKey = key(item);
    if (!groupKey) continue;
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), map(item)]);
  }
  return grouped;
}

function escapeLike(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}
