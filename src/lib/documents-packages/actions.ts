"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile, type Profile, type ProfileRole } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createStoragePath, matterDocumentBucket, validateDocumentFileMetadata } from "@/lib/documents-packages/storage";
import { resetVerificationOnEmailChange } from "@/lib/documents-packages/validation";

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

const reviewSchema = packageIdSchema.extend({
  comments: z.string().trim().max(700).optional().or(z.literal("")),
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

  const validatedFiles = [];
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const validation = validateDocumentFileMetadata({ name: file.name, type: file.type, size: file.size, bytes });
    if (!validation.ok) return { ok: false, message: `${file.name}: ${validation.message}` };
    validatedFiles.push({ file, bytes, validation });
  }

  if (!isSupabaseConfigured()) return { ok: true, message: `${validatedFiles.length} document${validatedFiles.length === 1 ? "" : "s"} accepted in development mode.` };

  const supabase = await createClient();
  for (const item of validatedFiles) {
    const storagePath = createStoragePath({ matterId: parsed.data.matterId, extension: item.validation.fileExtension });
    const { error: uploadError } = await supabase.storage.from(matterDocumentBucket).upload(storagePath, item.file, {
      contentType: item.validation.mimeType,
      upsert: false,
    });
    if (uploadError) return { ok: false, message: "Upload failed. No public URL was created." };
    const { data, error } = await supabase.from("matter_documents").insert({
      matter_id: parsed.data.matterId,
      title: files.length === 1 ? parsed.data.title : `${parsed.data.title} - ${item.validation.safeDisplayFilename}`,
      document_type: parsed.data.documentType,
      description: parsed.data.description || null,
      document_date: parsed.data.documentDate || null,
      source_type: "uploaded",
      storage_provider: "supabase",
      storage_path: storagePath,
      original_filename: item.file.name,
      display_filename: item.validation.safeDisplayFilename,
      mime_type: item.validation.mimeType,
      file_extension: item.validation.fileExtension,
      file_size_bytes: item.file.size,
      file_hash: item.validation.fileHash,
      status: "available",
      scan_status: "not_scanned",
      visibility: parsed.data.visibility,
      uploaded_by: permission.profile.id,
    }).select("id").single();
    if (error) return { ok: false, message: "The file uploaded, but document metadata could not be saved." };
    if (parsed.data.evidenceItemId) {
      await supabase.from("evidence_document_links").insert({
        evidence_item_id: parsed.data.evidenceItemId,
        document_id: String(data.id),
        created_by: permission.profile.id,
      });
    }
    await logActivity(parsed.data.matterId, permission.profile.id, "document_uploaded", "matter_document", String(data.id), "Document uploaded.", { scan_status: "not_scanned" });
  }
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: `${validatedFiles.length} document${validatedFiles.length === 1 ? "" : "s"} uploaded.` };
}

export async function submitUploadMatterDocumentsAction(formData: FormData) {
  await uploadMatterDocumentsAction(formData);
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
  await createExternalDocumentLinkAction(formData);
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
  await createPackageAction(formData);
}

export async function savePackageRecipientAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(recipientSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("edit");
  if (!permission.ok) return permission.result;
  const verificationStatus = parsed.data.verifyEmail
    ? "verified"
    : resetVerificationOnEmailChange(parsed.data.previousEmailAddress || null, parsed.data.emailAddress || null, "unverified");
  if (!isSupabaseConfigured()) return { ok: true, message: parsed.data.verifyEmail ? "Recipient email verified in development mode." : "Recipient saved in development mode." };
  const supabase = await createClient();
  const { error } = await supabase.from("outbound_package_recipients").insert({
    package_id: parsed.data.packageId,
    recipient_name_snapshot: parsed.data.recipientName,
    organization_name_snapshot: parsed.data.organizationName || null,
    email_address: parsed.data.emailAddress || null,
    email_source: parsed.data.emailSource,
    recipient_role: parsed.data.recipientRole,
    relationship_to_matter: parsed.data.relationshipToMatter,
    verification_status: verificationStatus,
    verified_by: parsed.data.verifyEmail ? permission.profile.id : null,
    verified_at: parsed.data.verifyEmail ? new Date().toISOString() : null,
    verification_note: parsed.data.verificationNote || null,
    is_primary: true,
  });
  if (error) return { ok: false, message: "We could not save the recipient." };
  revalidatePath("/packages");
  return { ok: true, message: "Recipient saved." };
}

export async function submitSavePackageRecipientAction(formData: FormData) {
  await savePackageRecipientAction(formData);
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
  revalidatePath("/packages");
  return { ok: true, message: "Package submitted for review." };
}

export async function submitPackageForReviewFormAction(formData: FormData) {
  await submitPackageForReviewAction(formData);
}

export async function requestPackageChangesAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(reviewSchema, formData);
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
  revalidatePath("/packages");
  return { ok: true, message: "Changes requested." };
}

export async function submitRequestPackageChangesAction(formData: FormData) {
  await requestPackageChangesAction(formData);
}

export async function approvePackageForSendAction(formData: FormData): Promise<DocumentPackageActionResult> {
  const parsed = parseForm(reviewSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requireRole("approve");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Package approved for the later send workflow in development mode." };
  const supabase = await createClient();
  const now = new Date().toISOString();
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
  revalidatePath("/packages");
  return { ok: true, message: "Package approved for the later send workflow." };
}

export async function submitApprovePackageForSendAction(formData: FormData) {
  await approvePackageForSendAction(formData);
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
  await approveTemplateVersionAction(formData);
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
