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

  return {
    documents: ((documents.data ?? []) as DocumentRow[]).map(mapDocumentRow),
    packages: ((packages.data ?? []) as PackageRow[]).map((row) => mapPackageRow(row, [])),
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
  let packageQuery = supabase.from("outbound_packages").select("*", { count: "exact" });
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
  const packages = ((data ?? []) as PackageRow[]).map((row) => mapPackageRow(row, []));
  return {
    packages,
    query,
    totalCount: count ?? packages.length,
    rangeStart: packages.length === 0 ? 0 : from + 1,
    rangeEnd: from + packages.length,
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

function mapDocumentRow(row: DocumentRow): MatterDocument {
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
    evidenceLinks: [],
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
    archivedAt: nullableString(row.archived_at),
  };
}

function mapPackageRow(row: PackageRow, validations: OutboundPackage["validations"]): OutboundPackage {
  return {
    id: stringValue(row.id),
    matterId: stringValue(row.matter_id),
    matterName: "Matter",
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
    recipients: [],
    documents: [],
    validations,
    reviews: [],
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

function escapeLike(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}
