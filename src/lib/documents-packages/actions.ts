"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { submitWithActionFeedback } from "@/lib/action-feedback/server";
import { getCurrentProfile, type Profile, type ProfileRole } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createDocumentId, createStoragePath, matterDocumentBucket, validateDocumentFileMetadata } from "@/lib/documents-packages/storage";
import { isScanningConfigured, scanFileForMalware } from "@/lib/documents-packages/scanning";
import { getPackageApprovalBlockers, resetVerificationOnEmailChange } from "@/lib/documents-packages/validation";
import type { DocumentScanStatus, DocumentStatus, OutboundPackage } from "@/lib/documents-packages/types";

export type DocumentPackageActionResult = { ok: true; message: string } | { ok: false; message: string; fieldErrors?: Record<string, string> };

const matterIdSchema = z.string().trim().min(1);
const optionalDate = z.string().trim().optional().or(z.literal(""));
const currency = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter a non-negative dollar amount.");

const uploadSchema = z.object({
  matterId: matterIdSchema,
  title: z.string().trim().min(1),
  documentType: z.string().trim().min(1),
  documentDate: optionalDate,
  visibility: z.string().trim().min(1),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  evidenceItemId: z.string().trim().optional().or(z.literal("")),
});

const externalLinkSchema = uploadSchema.extend({
  externalUrl: z.string().trim().url(),
  sourceSystem: z.string().trim().min(1).max(80),
  externalIdentifier: z.string().trim().max(120).optional().or(z.literal("")),
});

const packageSchema = z.object({
  matterId: matterIdSchema,
  packageType: z.string().trim().min(1),
  title: z.string().trim().min(1),
  amountDemanded: currency,
  responseDeadline: optionalDate,
  paymentInstructions: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(700).optional().or(z.literal("")),
});

const recipientSchema = z.object({
  packageId: z.string().trim().min(1),
  recipientId: z.string().trim().optional().or(z.literal("")),
  recipientName: z.string().trim().min(1),
  organizationName: z.string().trim().optional().or(z.literal("")),
  emailAddress: z.string().trim().email().optional().or(z.literal("")),
  previousEmailAddress: z.string().trim().optional().or(z.literal("")),
  emailSource: z.string().trim().min(1),
  recipientRole: z.string().trim().min(1),
  relationshipToMatter: z.string().trim().min(1),
  verificationNote: z.string().trim().max(500).optional().or(z.literal("")),
  verifyEmail: z.string().optional(),
});

const packageIdSchema = z.object({
  packageId: z.string().trim().min(1),
});

const documentScanSchema = z.object({
  matterId: matterIdSchema,
  documentId: z.string().trim().min(1),
});

const reviewSchema = packageIdSchema.extend({
  comments: z.string().trim().max(700).optional().or(z.literal("")),
});

const requestChangesSchema = packageIdSchema.extend({
  comments: z.string().trim().min(3, "Explain what needs to change.").max(700),
});

function canEdit(role: ProfileRole) {
  return ["admin", "partner", "attorney", "staff"].includes(role);
}

function canApprove(role: ProfileRole) {
  return ["admin", "partner", "attorney"].includes(role);
}

function canManageTemplates(role: ProfileRole) {
  return ["admin", "partner"].includes(role);
}

async function getActionProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) {
    return {
      id: "development-profile",
      email: "eli.linden@example.test",
      full_name: "Eli Linden",
      role: "attorney",
      job_title: "Attorney",
      avatar_url: null,
      is_active: true,
    };
  }
  return getCurrentProfile();
}

async function requireRole(kind: "edit" | "approve" | "templates" = "edit") {
  const profile = await getActionProfile();
  if (!profile?.is_active) return { ok: false as const, result: { ok: false as const, message: "Your session has expired. Please sign in again." } };
  if (kind === "edit" && !canEdit(profile.role)) return { ok: false as const, result: { ok: false as const, message: "You do not have permission to prepare documents or packages." } };
  if (kind === "approve" && !canApprove(profile.role)) return { ok: false as const, result: { ok: false as const, message: "Only an attorney, partner, or administrator may approve packages." } };
  if (kind === "templates" && !canManageTemplates(profile.role)) return { ok: false as const, result: { ok: false as const, message: "Only a partner or administrator may manage templates." } };
  return { ok: true as const, profile };
}

function parseForm<T>(schema: z.ZodType<T>, formData: FormData): { ok: true; data: T } | { ok: false; result: DocumentPackageActionResult } {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    return {
      ok: false,
      result: {
        ok: false,
        message: "Review the highlighted fields and try again.",
        fieldErrors: Object.fromEntries(Object.entries(fieldErrors).map(([key, values]) => [key, values?.[0] ?? "Check this field."])),
      },
    };
  }
  return { ok: true, data: parsed.data };
}

export async function uploadMatterDocumentsAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(uploadSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("edit");
  if (!permission.ok) return permission.result;
  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length === 0) return { ok: false, message: "Select at least one supported file." };

  const uploadFailures: string[] = [];
  const uploadWarnings: string[] = [];
  let uploadedCount = 0;
  let acceptedCount = 0;
  const supabase = isSupabaseConfigured() ? await createClient() : null;

  for (const file of files) {
    let bytes: ArrayBuffer;
    try {
      bytes = await file.arrayBuffer();
    } catch {
      uploadFailures.push(`${file.name}: The file could not be read.`);
      continue;
    }
    const validation = validateDocumentFileMetadata({ name: file.name, type: file.type, size: file.size, bytes });
    if (!validation.ok) {
      uploadFailures.push(`${file.name}: ${validation.message}`);
      continue;
    }

    if (!supabase) {
      acceptedCount += 1;
      continue;
    }

    const documentId = createDocumentId();
    const storagePath = createStoragePath({
      matterId: parsed.data.matterId,
      documentId,
      filename: validation.safeDisplayFilename,
    });
    const { error: uploadError } = await supabase.storage.from(matterDocumentBucket).upload(storagePath, file, {
      contentType: validation.mimeType,
      upsert: false,
    });
    if (uploadError) {
      uploadFailures.push(`${file.name}: Upload failed. No public URL was created.`);
      continue;
    }

    const { data, error } = await supabase.from("matter_documents").insert({
      id: documentId,
      matter_id: parsed.data.matterId,
      title: files.length === 1 ? parsed.data.title : `${parsed.data.title} - ${validation.safeDisplayFilename}`,
      document_type: parsed.data.documentType,
      description: parsed.data.description || null,
      document_date: parsed.data.documentDate || null,
      source_type: "uploaded",
      storage_provider: "supabase",
      storage_path: storagePath,
      original_filename: file.name,
      display_filename: validation.safeDisplayFilename,
      mime_type: validation.mimeType,
      file_extension: validation.fileExtension,
      file_size_bytes: file.size,
      file_hash: validation.fileHash,
      status: "processing",
      scan_status: "pending",
      visibility: parsed.data.visibility,
      uploaded_by: permission.profile.id,
    }).select("id").single();

    if (error) {
      const cleanup = await deleteOrphanedUpload(storagePath);
      if (!cleanup.removed) {
        await logActivity(
          parsed.data.matterId,
          permission.profile.id,
          "document_upload_cleanup_failed",
          "matter_document",
          documentId,
          "Document metadata failed and storage cleanup did not remove the uploaded file.",
          { storage_path: storagePath, reason: cleanup.reason }
        );
      }
      uploadFailures.push(
        cleanup.removed
          ? `${file.name}: Metadata could not be saved. The upload was removed; try again.`
          : `${file.name}: Metadata could not be saved, and the uploaded file was not removed because ${cleanup.reason}. An activity entry records the storage path for an administrator.`
      );
      continue;
    }
    uploadedCount += 1;

    if (parsed.data.evidenceItemId) {
      await supabase.from("evidence_document_links").insert({
        evidence_item_id: parsed.data.evidenceItemId,
        document_id: String(data.id),
        created_by: permission.profile.id,
      });
    }
    await logActivity(parsed.data.matterId, permission.profile.id, "document_uploaded", "matter_document", String(data.id), "Document uploaded.", { scan_status: "pending" });

    if (!isScanningConfigured()) {
      await supabase.from("matter_documents").update({ status: "failed", scan_status: "scan_failed" }).eq("id", documentId);
      uploadWarnings.push(`${file.name}: Uploaded, but malware scanning is not configured.`);
    }
  }

  if (!supabase) {
    if (acceptedCount === 0) return { ok: false, message: `No documents accepted. ${formatUploadMessages(uploadFailures)}` };
    return { ok: true, message: `${acceptedCount} document${acceptedCount === 1 ? "" : "s"} accepted in development mode.${uploadFailures.length ? ` ${uploadFailures.length} skipped: ${formatUploadMessages(uploadFailures)}` : ""}` };
  }

  if (uploadedCount > 0) revalidateMatter(parsed.data.matterId);
  if (uploadedCount === 0) return { ok: false, message: `No documents uploaded. ${formatUploadMessages(uploadFailures)}` };
  const skippedMessage = uploadFailures.length ? ` ${uploadFailures.length} skipped: ${formatUploadMessages(uploadFailures)}` : "";
  const warningMessage = uploadWarnings.length ? ` ${formatUploadMessages(uploadWarnings)}` : "";
  const scanningMessage = isScanningConfigured() ? " Scanning is pending; use Retry scan if it does not clear." : "";
  return { ok: true, message: `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} uploaded.${skippedMessage}${warningMessage}${scanningMessage}` };
}

function formatUploadMessages(messages: string[]) {
  if (messages.length === 0) return "";
  const visibleMessages = messages.slice(0, 3).join(" ");
  return messages.length > 3 ? `${visibleMessages} +${messages.length - 3} more.` : visibleMessages;
}

function statusForScanOutcome(scanOutcome: DocumentScanStatus): DocumentStatus {
  if (scanOutcome === "clean") return "available";
  if (scanOutcome === "flagged") return "quarantined";
  if (scanOutcome === "scan_failed") return "failed";
  return "processing";
}

async function deleteOrphanedUpload(storagePath: string): Promise<{ removed: boolean; reason?: string }> {
  const admin = createAdminClient();
  if (!admin) return { removed: false, reason: "Supabase service-role storage access is not configured" };
  const { error } = await admin.storage.from(matterDocumentBucket).remove([storagePath]);
  if (error) return { removed: false, reason: "storage cleanup failed" };
  return { removed: true };
}

export async function submitUploadMatterDocumentsAction(formData: FormData) {
  await submitWithActionFeedback(uploadMatterDocumentsAction, formData);
}

export async function retryDocumentScanAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(documentScanSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("edit");
  if (!permission.ok) return permission.result;
  if (!isScanningConfigured()) return { ok: false, message: "Malware scanning is not configured. Set VIRUSTOTAL_API_KEY, then retry the scan." };
  if (!isSupabaseConfigured()) return { ok: true, message: "Document scan retried in development mode." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: "Document scanning requires Supabase admin configuration." };
  const { data: document, error } = await admin
    .from("matter_documents")
    .select("id,matter_id,storage_path,mime_type,display_filename,source_type")
    .eq("id", parsed.data.documentId)
    .eq("matter_id", parsed.data.matterId)
    .maybeSingle();
  if (error || !document) return { ok: false, message: "We could not find this document." };
  if (document.source_type !== "uploaded" || !document.storage_path) return { ok: false, message: "Only uploaded files can be malware scanned." };

  const { data: fileBlob, error: downloadError } = await admin.storage.from(matterDocumentBucket).download(String(document.storage_path));
  if (downloadError || !fileBlob) {
    await admin.from("matter_documents").update({ status: "failed", scan_status: "scan_failed" }).eq("id", parsed.data.documentId);
    revalidateMatter(parsed.data.matterId);
    return { ok: false, message: "The stored file could not be read for scanning." };
  }

  const outcome = await scanFileForMalware({
    bytes: await fileBlob.arrayBuffer(),
    filename: typeof document.display_filename === "string" ? document.display_filename : "document",
    mimeType: typeof document.mime_type === "string" ? document.mime_type : "application/octet-stream",
  });
  await admin.from("matter_documents").update({ status: statusForScanOutcome(outcome), scan_status: outcome }).eq("id", parsed.data.documentId);
  if (outcome === "flagged") {
    await logActivity(parsed.data.matterId, permission.profile.id, "document_flagged", "matter_document", parsed.data.documentId, "Uploaded file was flagged by malware scanning and quarantined.", { scan_status: outcome });
  }
  revalidateMatter(parsed.data.matterId);
  if (outcome === "pending") return { ok: true, message: "Scan submitted. The document is still pending." };
  if (outcome === "scan_failed") return { ok: false, message: "The scan failed. Try again or check the scanning service." };
  return { ok: true, message: outcome === "clean" ? "Document scan passed." : "Document was flagged and quarantined." };
}

export async function submitRetryDocumentScanAction(formData: FormData) {
  await submitWithActionFeedback(retryDocumentScanAction, formData);
}

export async function createExternalDocumentLinkAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(externalLinkSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("edit");
  if (!permission.ok) return permission.result;
  const url = new URL(parsed.data.externalUrl);
  if (!["https:", "http:"].includes(url.protocol)) return { ok: false, message: "External document links must use HTTP or HTTPS." };
  if (!isSupabaseConfigured()) return { ok: true, message: "External document link created in development mode." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("matter_documents").insert({
    matter_id: parsed.data.matterId,
    title: parsed.data.title,
    document_type: parsed.data.documentType,
    description: parsed.data.description || null,
    document_date: parsed.data.documentDate || null,
    source_type: "external_link",
    storage_provider: "external",
    external_url: parsed.data.externalUrl,
    display_filename: parsed.data.title,
    status: "available",
    scan_status: "not_scanned",
    visibility: parsed.data.visibility,
    uploaded_by: permission.profile.id,
  }).select("id").single();
  if (error) return { ok: false, message: "We could not save this external document link." };
  await supabase.from("external_references").insert({
    entity_type: "matter_document",
    entity_id: data.id,
    system_name: parsed.data.sourceSystem,
    external_id: parsed.data.externalIdentifier || null,
    external_url: parsed.data.externalUrl,
    sync_status: "not_synced",
  });
  await logActivity(parsed.data.matterId, permission.profile.id, "document_linked", "matter_document", String(data.id), "External document linked.", { source_system: parsed.data.sourceSystem });
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: "External document link created." };
}

export async function submitCreateExternalDocumentLinkAction(formData: FormData) {
  await submitWithActionFeedback(createExternalDocumentLinkAction, formData);
}

export async function createPackageAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(packageSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Package created in development mode." };
  const supabase = await createClient();
  const { error } = await supabase.from("outbound_packages").insert({
    matter_id: parsed.data.matterId,
    package_type: parsed.data.packageType,
    status: "assembling",
    title: parsed.data.title,
    amount_demanded: parsed.data.amountDemanded,
    response_deadline: parsed.data.responseDeadline || null,
    payment_instructions: parsed.data.paymentInstructions || null,
    notes: parsed.data.notes || null,
    created_by: permission.profile.id,
    assigned_to: permission.profile.id,
  });
  if (error) return { ok: false, message: "We could not create this package." };
  revalidateMatter(parsed.data.matterId);
  revalidatePath("/packages");
  return { ok: true, message: "Package created." };
}

export async function submitCreatePackageAction(formData: FormData) {
  await submitWithActionFeedback(createPackageAction, formData);
}

export async function savePackageRecipientAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(recipientSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: parsed.data.verifyEmail ? "Recipient email verified in development mode." : "Recipient saved in development mode." };
  const supabase = await createClient();

  const { data: existingRecipient, error: existingRecipientError } = parsed.data.recipientId
    ? await supabase
        .from("outbound_package_recipients")
        .select("id,email_address,verification_status,verified_by,verified_at")
        .eq("id", parsed.data.recipientId)
        .eq("package_id", parsed.data.packageId)
        .maybeSingle()
    : await supabase
        .from("outbound_package_recipients")
        .select("id,email_address,verification_status,verified_by,verified_at")
        .eq("package_id", parsed.data.packageId)
        .eq("is_primary", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
  if (existingRecipientError) return { ok: false, message: "We could not load this recipient." };
  if (parsed.data.recipientId && !existingRecipient) return { ok: false, message: "We could not find this recipient." };
  const effectiveRecipientId = typeof existingRecipient?.id === "string" ? existingRecipient.id : parsed.data.recipientId;

  const previousEmailAddress = typeof existingRecipient?.email_address === "string"
    ? existingRecipient.email_address
    : parsed.data.previousEmailAddress || null;
  const currentVerificationStatus = String(existingRecipient?.verification_status ?? "unverified") as OutboundPackage["recipients"][number]["verificationStatus"];
  const verificationStatus = parsed.data.verifyEmail
    ? "verified"
    : resetVerificationOnEmailChange(previousEmailAddress, parsed.data.emailAddress || null, currentVerificationStatus);
  const verificationPreserved = Boolean(existingRecipient) && verificationStatus === currentVerificationStatus;
  const verifiedBy = parsed.data.verifyEmail
    ? permission.profile.id
    : verificationPreserved && typeof existingRecipient?.verified_by === "string"
      ? existingRecipient.verified_by
      : null;
  const verifiedAt = parsed.data.verifyEmail
    ? new Date().toISOString()
    : verificationPreserved && typeof existingRecipient?.verified_at === "string"
      ? existingRecipient.verified_at
      : null;
  const values = {
    package_id: parsed.data.packageId,
    recipient_name_snapshot: parsed.data.recipientName,
    organization_name_snapshot: parsed.data.organizationName || null,
    email_address: parsed.data.emailAddress || null,
    email_source: parsed.data.emailSource,
    recipient_role: parsed.data.recipientRole,
    relationship_to_matter: parsed.data.relationshipToMatter,
    verification_status: verificationStatus,
    verified_by: verifiedBy,
    verified_at: verifiedAt,
    verification_note: parsed.data.verificationNote || null,
    is_primary: true,
  };

  const { error: primaryRecipientError } = await supabase
    .from("outbound_package_recipients")
    .update({ is_primary: false })
    .eq("package_id", parsed.data.packageId)
    .neq("id", effectiveRecipientId || "00000000-0000-0000-0000-000000000000");
  if (primaryRecipientError) return { ok: false, message: "We could not update the primary recipient." };

  const { error } = effectiveRecipientId
    ? await supabase.from("outbound_package_recipients").update(values).eq("id", effectiveRecipientId).eq("package_id", parsed.data.packageId)
    : await supabase.from("outbound_package_recipients").insert(values);
  if (error) return { ok: false, message: "We could not save the recipient." };
  await revalidatePackageWorkspace(parsed.data.packageId);
  return { ok: true, message: "Recipient saved." };
}

export async function submitSavePackageRecipientAction(formData: FormData) {
  await submitWithActionFeedback(savePackageRecipientAction, formData);
}

export async function submitPackageForReviewAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(packageIdSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Package submitted for review in development mode." };
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("outbound_packages").update({
    status: "ready_for_review",
    submitted_for_review_by: permission.profile.id,
    submitted_for_review_at: now,
  }).eq("id", parsed.data.packageId);
  if (error) return { ok: false, message: "We could not submit this package for review." };
  await revalidatePackageWorkspace(parsed.data.packageId);
  return { ok: true, message: "Package submitted for review." };
}

export async function submitPackageForReviewFormAction(formData: FormData) {
  await submitWithActionFeedback(submitPackageForReviewAction, formData);
}

export async function requestPackageChangesAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(requestChangesSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Changes requested in development mode." };
  const supabase = await createClient();
  await supabase.from("outbound_package_reviews").insert({
    package_id: parsed.data.packageId,
    reviewer_id: permission.profile.id,
    review_type: "preparation_review",
    decision: "changes_requested",
    comments: parsed.data.comments || null,
  });
  const { error } = await supabase.from("outbound_packages").update({ status: "changes_requested", approved_by: null, approved_at: null }).eq("id", parsed.data.packageId);
  if (error) return { ok: false, message: "We could not request changes." };
  await revalidatePackageWorkspace(parsed.data.packageId);
  return { ok: true, message: "Changes requested." };
}

export async function approvePackageForSendAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(reviewSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("approve");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Package approved for the later send workflow in development mode." };
  const supabase = await createClient();
  const now = new Date().toISOString();
  const approvalPackage = await loadPackageApprovalFacts(parsed.data.packageId);
  if (!approvalPackage) return { ok: false, message: "We could not find this package." };
  const blockers = getPackageApprovalBlockers(approvalPackage);
  if (blockers.length > 0) {
    const fallbackStatus = approvalPackage.status === "approved_for_send" ? "validation_needed" : approvalPackage.status;
    await supabase.from("outbound_packages").update({ status: fallbackStatus, approved_by: null, approved_at: null }).eq("id", parsed.data.packageId);
    await revalidatePackageWorkspace(parsed.data.packageId);
    return { ok: false, message: `Package cannot be approved yet. ${blockers[0]}` };
  }
  await supabase.from("outbound_package_reviews").insert({
    package_id: parsed.data.packageId,
    reviewer_id: permission.profile.id,
    review_type: "attorney_review",
    decision: "approved",
    comments: parsed.data.comments || null,
  });
  const { error } = await supabase.from("outbound_packages").update({
    status: "approved_for_send",
    approved_by: permission.profile.id,
    approved_at: now,
  }).eq("id", parsed.data.packageId);
  if (error) return { ok: false, message: "We could not approve this package." };
  await revalidatePackageWorkspace(parsed.data.packageId);
  return { ok: true, message: "Package approved for the later send workflow." };
}

export async function submitApprovePackageForSendAction(formData: FormData) {
  await submitWithActionFeedback(approvePackageForSendAction, formData);
}

export async function approveTemplateVersionAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const permission = await requireRole("templates");
  if (!permission.ok) return permission.result;
  const versionId = String(formData.get("versionId") ?? "");
  if (!versionId) return { ok: false, message: "Select a template version." };
  if (!isSupabaseConfigured()) return { ok: true, message: "Template version approved in development mode." };
  const supabase = await createClient();
  const { error } = await supabase.from("document_template_versions").update({
    status: "approved",
    approved_by: permission.profile.id,
    approved_at: new Date().toISOString(),
  }).eq("id", versionId).eq("status", "draft");
  if (error) return { ok: false, message: "We could not approve this template version." };
  revalidatePath("/settings");
  return { ok: true, message: "Template version approved." };
}

export async function submitApproveTemplateVersionAction(formData: FormData) {
  await submitWithActionFeedback(approveTemplateVersionAction, formData);
}

async function logActivity(matterId: string, actorId: string, actionType: string, entityType: string, entityId: string, description: string, newValue: Record<string, unknown> | null) {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  await supabase.from("activity_logs").insert({
    matter_id: matterId,
    actor_id: actorId,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId,
    description,
    new_value: newValue,
  });
}

function revalidateMatter(matterId: string) {
  revalidatePath(`/matters/${matterId}`);
  revalidatePath("/matters");
}

async function revalidatePackageWorkspace(packageId: string) {
  revalidatePath("/packages");
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  const { data } = await supabase.from("outbound_packages").select("matter_id").eq("id", packageId).maybeSingle();
  const matterId = data?.matter_id ? String(data.matter_id) : null;
  if (matterId) revalidateMatter(matterId);
}

async function loadPackageApprovalFacts(packageId: string): Promise<Pick<OutboundPackage, "coverDocumentId" | "documents" | "recipients" | "reviews" | "status" | "templateVersionId" | "templateVersionStatus" | "validations"> | null> {
  const supabase = await createClient();
  const [{ data: pkg }, { data: recipients }, { data: packageDocuments }, { data: validations }, { data: reviews }] = await Promise.all([
    supabase.from("outbound_packages").select("status,cover_document_id,template_version_id").eq("id", packageId).maybeSingle(),
    supabase.from("outbound_package_recipients").select("id,recipient_name_snapshot,organization_name_snapshot,email_address,email_source,recipient_role,relationship_to_matter,verification_status,verified_at,verification_note,is_primary").eq("package_id", packageId),
    supabase.from("outbound_package_documents").select("id,document_id,document_version_number_snapshot,display_filename_snapshot,document_type_snapshot,sort_order,is_required").eq("package_id", packageId),
    supabase.from("outbound_package_validations").select("id,validation_key,status,severity,title,description,override_reason,resolved_at").eq("package_id", packageId),
    supabase.from("outbound_package_reviews").select("id,review_type,decision,comments,created_at").eq("package_id", packageId),
  ]);

  if (!pkg) return null;
  const templateVersionId = typeof pkg.template_version_id === "string" ? pkg.template_version_id : null;
  const { data: templateVersion } = templateVersionId
    ? await supabase.from("document_template_versions").select("status").eq("id", templateVersionId).maybeSingle()
    : { data: null };
  const documentIds = ((packageDocuments ?? []) as Array<{ document_id: string }>).map((document) => document.document_id);
  const { data: matterDocuments } = documentIds.length > 0
    ? await supabase.from("matter_documents").select("id,status,scan_status,visibility,title").in("id", documentIds)
    : { data: [] };
  const documentStatus = new Map((matterDocuments ?? []).map((document) => [String(document.id), document]));

  return {
    status: String(pkg.status) as OutboundPackage["status"],
    coverDocumentId: pkg.cover_document_id ? String(pkg.cover_document_id) : null,
    templateVersionId,
    templateVersionStatus: typeof templateVersion?.status === "string" ? templateVersion.status as OutboundPackage["templateVersionStatus"] : null,
    recipients: ((recipients ?? []) as Array<Record<string, unknown>>).map((recipient) => ({
      id: String(recipient.id),
      recipientNameSnapshot: String(recipient.recipient_name_snapshot),
      organizationNameSnapshot: typeof recipient.organization_name_snapshot === "string" ? recipient.organization_name_snapshot : null,
      emailAddress: typeof recipient.email_address === "string" ? recipient.email_address : null,
      emailSource: String(recipient.email_source) as OutboundPackage["recipients"][number]["emailSource"],
      recipientRole: String(recipient.recipient_role) as OutboundPackage["recipients"][number]["recipientRole"],
      relationshipToMatter: typeof recipient.relationship_to_matter === "string" ? recipient.relationship_to_matter : null,
      verificationStatus: String(recipient.verification_status) as OutboundPackage["recipients"][number]["verificationStatus"],
      verifiedByName: null,
      verifiedAt: typeof recipient.verified_at === "string" ? recipient.verified_at : null,
      verificationNote: typeof recipient.verification_note === "string" ? recipient.verification_note : null,
      isPrimary: Boolean(recipient.is_primary),
    })),
    documents: ((packageDocuments ?? []) as Array<Record<string, unknown>>).map((document) => {
      const status = documentStatus.get(String(document.document_id));
      return {
        id: String(document.id),
        documentId: String(document.document_id),
        title: typeof status?.title === "string" ? status.title : String(document.display_filename_snapshot),
        documentVersionNumberSnapshot: Number(document.document_version_number_snapshot) || 1,
        displayFilenameSnapshot: String(document.display_filename_snapshot),
        documentTypeSnapshot: String(document.document_type_snapshot) as OutboundPackage["documents"][number]["documentTypeSnapshot"],
        scanStatus: String(status?.scan_status ?? "not_scanned") as OutboundPackage["documents"][number]["scanStatus"],
        visibility: String(status?.visibility ?? "package_eligible") as OutboundPackage["documents"][number]["visibility"],
        status: String(status?.status ?? "available") as OutboundPackage["documents"][number]["status"],
        sortOrder: Number(document.sort_order) || 1,
        isRequired: Boolean(document.is_required),
      };
    }),
    validations: ((validations ?? []) as Array<Record<string, unknown>>).map((validation) => ({
      id: String(validation.id),
      validationKey: String(validation.validation_key),
      status: String(validation.status) as OutboundPackage["validations"][number]["status"],
      severity: String(validation.severity) as OutboundPackage["validations"][number]["severity"],
      title: String(validation.title),
      description: String(validation.description),
      overrideReason: typeof validation.override_reason === "string" ? validation.override_reason : null,
      resolvedAt: typeof validation.resolved_at === "string" ? validation.resolved_at : null,
    })),
    reviews: ((reviews ?? []) as Array<Record<string, unknown>>).map((review) => ({
      id: String(review.id),
      reviewerName: null,
      reviewType: String(review.review_type) as OutboundPackage["reviews"][number]["reviewType"],
      decision: String(review.decision) as OutboundPackage["reviews"][number]["decision"],
      comments: typeof review.comments === "string" ? review.comments : null,
      createdAt: String(review.created_at),
    })),
  };
}
