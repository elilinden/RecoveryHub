"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile, type Profile, type ProfileRole } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { defaultMattersQuery, parseMattersQuery } from "@/lib/matters-workspace/query";

export type WorkspaceActionResult = { ok: true; message: string } | { ok: false; message: string; fieldErrors?: Record<string, string> };

const matterIdSchema = z.string().trim().min(1);
const optionalDate = z.string().trim().optional().or(z.literal(""));
const currency = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter a non-negative dollar amount.");

const currentStatusSchema = z.object({
  matterId: matterIdSchema,
  currentStatusSummary: z.string().trim().max(600).optional().or(z.literal("")),
  stage: z.string().trim().min(1),
  priority: z.string().trim().min(1),
  nextAction: z.string().trim().max(160).optional().or(z.literal("")),
  nextActionDueDate: optionalDate,
  nextActionAssignedTo: z.string().trim().optional().or(z.literal("")),
});

const financialSchema = z.object({
  matterId: matterIdSchema,
  amountPaid: currency,
  deductible: currency,
  anticipatedAdditionalPayments: currency,
  recoverableExpenses: currency,
  amountSought: currency,
  estimatedLegalCost: currency,
  amountRecovered: currency,
});

const evidenceSchema = z.object({
  matterId: matterIdSchema,
  evidenceId: z.string().trim().optional().or(z.literal("")),
  evidenceType: z.string().trim().min(1),
  status: z.string().trim().min(1),
  dateRequested: optionalDate,
  dateReceived: optionalDate,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const deadlineSchema = z.object({
  matterId: matterIdSchema,
  deadlineId: z.string().trim().optional().or(z.literal("")),
  title: z.string().trim().min(1),
  deadlineType: z.string().trim().min(1),
  deadlineDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  reminderDate: optionalDate,
  assignedTo: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  verify: z.string().optional(),
});

const taskSchema = z.object({
  matterId: matterIdSchema,
  taskId: z.string().trim().optional().or(z.literal("")),
  title: z.string().trim().min(1),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  assignedTo: z.string().trim().optional().or(z.literal("")),
  dueDate: optionalDate,
  priority: z.string().trim().min(1),
  status: z.string().trim().min(1),
});

const partySchema = z.object({
  matterId: matterIdSchema,
  partyId: z.string().trim().optional().or(z.literal("")),
  role: z.string().trim().min(1),
  isPrimary: z.string().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  contactId: z.string().trim().optional().or(z.literal("")),
  organizationId: z.string().trim().optional().or(z.literal("")),
});

const eventSchema = z.object({
  matterId: matterIdSchema,
  eventType: z.string().trim().min(1),
  occurredAt: z.string().trim().min(1),
  description: z.string().trim().min(1).max(700),
});

const closeSchema = z.object({
  matterId: matterIdSchema,
  reason: z.string().trim().min(1),
  closingDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(700).optional().or(z.literal("")),
});

const reopenSchema = z.object({
  matterId: matterIdSchema,
  reason: z.string().trim().min(1),
  stage: z.string().trim().min(1),
  nextAction: z.string().trim().min(1),
  nextActionDueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  responsibleUser: z.string().trim().min(1),
});

const savedViewSchema = z.object({
  name: z.string().trim().min(1),
  queryString: z.string().trim().optional().or(z.literal("")),
  isShared: z.string().optional(),
});

function canEdit(role: ProfileRole) {
  return ["admin", "partner", "attorney", "staff"].includes(role);
}

function canLegalEdit(role: ProfileRole) {
  return ["admin", "partner", "attorney"].includes(role);
}

function canAdminister(role: ProfileRole) {
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

async function requirePermission(kind: "edit" | "legal" | "admin" | "view" = "edit"): Promise<{ ok: true; profile: Profile } | { ok: false; result: WorkspaceActionResult }> {
  const profile = await getActionProfile();
  if (!profile || !profile.is_active) {
    return { ok: false, result: { ok: false, message: "Your session has expired. Please sign in again." } };
  }
  if (kind === "view") return { ok: true, profile };
  if (kind === "edit" && !canEdit(profile.role)) return { ok: false, result: { ok: false, message: "You do not have permission to edit this matter." } };
  if (kind === "legal" && !canLegalEdit(profile.role)) return { ok: false, result: { ok: false, message: "Only an attorney, partner, or administrator may perform this action." } };
  if (kind === "admin" && !canAdminister(profile.role)) return { ok: false, result: { ok: false, message: "Only a partner or administrator may perform this action." } };
  return { ok: true, profile };
}

function parseForm<T>(schema: z.ZodType<T>, formData: FormData): { ok: true; data: T } | { ok: false; result: WorkspaceActionResult } {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    return {
      ok: false,
      result: {
        ok: false,
        message: "Review the highlighted fields and try again.",
        fieldErrors: Object.fromEntries(
          Object.entries(fieldErrors).map(([key, values]) => [key, values?.[0] ?? "Check this field."])
        ),
      },
    };
  }
  return { ok: true, data: parsed.data };
}

export async function updateCurrentStatusAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(currentStatusSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission("edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Current status updated in development mode." };

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("matters")
    .update({
      current_status_summary: parsed.data.currentStatusSummary || null,
      status_summary_updated_at: now,
      status_summary_updated_by: permission.profile.id,
      stage: parsed.data.stage,
      priority: parsed.data.priority,
      next_action: parsed.data.nextAction || null,
      next_action_due_date: parsed.data.nextActionDueDate || null,
    })
    .eq("id", parsed.data.matterId)
    .select("id")
    .single();
  if (error) return { ok: false, message: "We could not update the current status." };
  await logActivity(parsed.data.matterId, permission.profile.id, "update_status", "matter", parsed.data.matterId, "Current status updated.", { stage: parsed.data.stage, priority: parsed.data.priority });
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: "Matter status updated." };
}

export async function submitUpdateCurrentStatusAction(formData: FormData) {
  await updateCurrentStatusAction(formData);
}

export async function updateFinancialsAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(financialSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission("edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Financials updated in development mode." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("matters")
    .update({
      amount_paid: parsed.data.amountPaid,
      deductible: parsed.data.deductible,
      anticipated_additional_payments: parsed.data.anticipatedAdditionalPayments,
      recoverable_expenses: parsed.data.recoverableExpenses,
      amount_sought: parsed.data.amountSought,
      estimated_legal_cost: parsed.data.estimatedLegalCost,
      amount_recovered: parsed.data.amountRecovered,
    })
    .eq("id", parsed.data.matterId)
    .select("id")
    .single();
  if (error) return { ok: false, message: "We could not update financials." };
  await logActivity(parsed.data.matterId, permission.profile.id, "update_financials", "matter", parsed.data.matterId, "Financial fields updated.", null);
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: "Financials updated." };
}

export async function submitUpdateFinancialsAction(formData: FormData) {
  await updateFinancialsAction(formData);
}

export async function upsertEvidenceAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(evidenceSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission("edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Evidence updated in development mode." };
  const supabase = await createClient();
  const values = {
    matter_id: parsed.data.matterId,
    evidence_type: parsed.data.evidenceType,
    status: parsed.data.status,
    date_requested: parsed.data.dateRequested || (parsed.data.status === "requested" ? today() : null),
    date_received: parsed.data.dateReceived || (parsed.data.status === "received" ? today() : null),
    notes: parsed.data.notes || null,
    created_by: permission.profile.id,
  };
  const query = parsed.data.evidenceId
    ? supabase.from("evidence_items").update(values).eq("id", parsed.data.evidenceId).select("id").single()
    : supabase.from("evidence_items").insert(values).select("id").single();
  const { error } = await query;
  if (error) return { ok: false, message: "We could not update evidence." };
  if (parsed.data.status === "received") {
    await addMatterEvent(parsed.data.matterId, permission.profile.id, "document_received", "Evidence marked received.");
  }
  await logActivity(parsed.data.matterId, permission.profile.id, "update_evidence", "evidence_item", parsed.data.evidenceId || null, "Evidence status updated.", { status: parsed.data.status });
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: "Evidence updated." };
}

export async function submitUpsertEvidenceAction(formData: FormData) {
  await upsertEvidenceAction(formData);
}

export async function upsertDeadlineAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(deadlineSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission(parsed.data.verify ? "legal" : "edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Deadline saved in development mode." };
  const supabase = await createClient();
  const now = new Date().toISOString();
  const values = {
    matter_id: parsed.data.matterId,
    title: parsed.data.title,
    deadline_type: parsed.data.deadlineType,
    deadline_date: parsed.data.deadlineDate,
    reminder_date: parsed.data.reminderDate || null,
    assigned_to: parsed.data.assignedTo || null,
    notes: parsed.data.notes || null,
    is_verified: Boolean(parsed.data.verify),
    verified_by: parsed.data.verify ? permission.profile.id : null,
    verified_at: parsed.data.verify ? now : null,
    created_by: permission.profile.id,
  };
  const query = parsed.data.deadlineId
    ? supabase.from("deadlines").update(values).eq("id", parsed.data.deadlineId).select("id").single()
    : supabase.from("deadlines").insert(values).select("id").single();
  const { error } = await query;
  if (error) return { ok: false, message: "We could not save this deadline." };
  await logActivity(parsed.data.matterId, permission.profile.id, parsed.data.verify ? "verify_deadline" : "update_deadline", "deadline", parsed.data.deadlineId || null, parsed.data.verify ? "Deadline verified." : "Deadline updated.", { deadline_date: parsed.data.deadlineDate });
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: parsed.data.verify ? "Deadline verified." : "Deadline saved." };
}

export async function submitUpsertDeadlineAction(formData: FormData) {
  await upsertDeadlineAction(formData);
}

export async function upsertTaskAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(taskSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission("edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Task saved in development mode." };
  const supabase = await createClient();
  const values = {
    matter_id: parsed.data.matterId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    assigned_to: parsed.data.assignedTo || null,
    due_date: parsed.data.dueDate || null,
    priority: parsed.data.priority,
    status: parsed.data.status,
    completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
    created_by: permission.profile.id,
  };
  const query = parsed.data.taskId
    ? supabase.from("tasks").update(values).eq("id", parsed.data.taskId).select("id").single()
    : supabase.from("tasks").insert(values).select("id").single();
  const { error } = await query;
  if (error) return { ok: false, message: "We could not save this task." };
  if (parsed.data.status === "completed") {
    await addMatterEvent(parsed.data.matterId, permission.profile.id, "other", `Task completed: ${parsed.data.title}`);
  }
  await logActivity(parsed.data.matterId, permission.profile.id, "update_task", "task", parsed.data.taskId || null, "Task updated.", { status: parsed.data.status });
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: "Task saved." };
}

export async function submitUpsertTaskAction(formData: FormData) {
  await upsertTaskAction(formData);
}

export async function upsertPartyAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(partySchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission("edit");
  if (!permission.ok) return permission.result;
  if (!parsed.data.partyId && !parsed.data.contactId && !parsed.data.organizationId) return { ok: false, message: "Select a contact or organization." };
  if (!isSupabaseConfigured()) return { ok: true, message: "Party association saved in development mode." };
  const supabase = await createClient();
  const query = parsed.data.partyId
    ? supabase
        .from("matter_parties")
        .update({
          party_role: parsed.data.role,
          is_primary: Boolean(parsed.data.isPrimary),
          notes: parsed.data.notes || null,
        })
        .eq("id", parsed.data.partyId)
        .select("id")
        .single()
    : supabase
        .from("matter_parties")
        .insert({
          matter_id: parsed.data.matterId,
          contact_id: parsed.data.contactId || null,
          organization_id: parsed.data.organizationId || null,
          party_role: parsed.data.role,
          is_primary: Boolean(parsed.data.isPrimary),
          notes: parsed.data.notes || null,
        })
        .select("id")
        .single();
  const { error } = await query;
  if (error) return { ok: false, message: "We could not save this party association." };
  await logActivity(parsed.data.matterId, permission.profile.id, "update_party", "matter_party", parsed.data.partyId || null, "Matter party association updated.", { role: parsed.data.role });
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: "Party association saved." };
}

export async function submitUpsertPartyAction(formData: FormData) {
  await upsertPartyAction(formData);
}

export async function addMatterEventAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission("edit");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Matter event added in development mode." };
  await addMatterEvent(parsed.data.matterId, permission.profile.id, parsed.data.eventType, parsed.data.description, parsed.data.occurredAt);
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: "Matter event added." };
}

export async function submitAddMatterEventAction(formData: FormData) {
  await addMatterEventAction(formData);
}

export async function closeMatterAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(closeSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission("legal");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Matter closed in development mode." };
  const supabase = await createClient();
  const closedAt = `${parsed.data.closingDate}T12:00:00.000Z`;
  const { error } = await supabase
    .from("matters")
    .update({ stage: "closed", closed_at: closedAt, closed_reason: parsed.data.reason, closed_by: permission.profile.id })
    .eq("id", parsed.data.matterId)
    .select("id")
    .single();
  if (error) return { ok: false, message: "We could not close this matter." };
  await addMatterEvent(parsed.data.matterId, permission.profile.id, "matter_closed", parsed.data.note || `Matter closed: ${parsed.data.reason}`, closedAt);
  await logActivity(parsed.data.matterId, permission.profile.id, "close_matter", "matter", parsed.data.matterId, "Matter closed.", { reason: parsed.data.reason });
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: "Matter closed." };
}

export async function submitCloseMatterAction(formData: FormData) {
  await closeMatterAction(formData);
}

export async function reopenMatterAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(reopenSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission("legal");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Matter reopened in development mode." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("matters")
    .update({
      stage: parsed.data.stage,
      next_action: parsed.data.nextAction,
      next_action_due_date: parsed.data.nextActionDueDate,
      closed_reason: null,
      last_substantive_activity_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.matterId)
    .select("id")
    .single();
  if (error) return { ok: false, message: "We could not reopen this matter." };
  await addMatterEvent(parsed.data.matterId, permission.profile.id, "other", `Matter reopened: ${parsed.data.reason}`);
  await logActivity(parsed.data.matterId, permission.profile.id, "reopen_matter", "matter", parsed.data.matterId, "Matter reopened.", { stage: parsed.data.stage });
  revalidateMatter(parsed.data.matterId);
  return { ok: true, message: "Matter reopened." };
}

export async function submitReopenMatterAction(formData: FormData) {
  await reopenMatterAction(formData);
}

export async function archiveMatterAction(formData: FormData): Promise<WorkspaceActionResult> {
  const matterId = String(formData.get("matterId") ?? "");
  const permission = await requirePermission("admin");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Matter archived in development mode." };
  const supabase = await createClient();
  const { error } = await supabase.from("matters").update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: permission.profile.id }).eq("id", matterId).select("id").single();
  if (error) return { ok: false, message: "We could not archive this matter." };
  await logActivity(matterId, permission.profile.id, "archive_matter", "matter", matterId, "Matter archived.", null);
  revalidateMatter(matterId);
  return { ok: true, message: "Matter archived." };
}

export async function submitArchiveMatterAction(formData: FormData) {
  await archiveMatterAction(formData);
}

export async function restoreMatterAction(formData: FormData): Promise<WorkspaceActionResult> {
  const matterId = String(formData.get("matterId") ?? "");
  const permission = await requirePermission("admin");
  if (!permission.ok) return permission.result;
  if (!isSupabaseConfigured()) return { ok: true, message: "Matter restored in development mode." };
  const supabase = await createClient();
  const { error } = await supabase.from("matters").update({ is_archived: false, archived_at: null, archived_by: null }).eq("id", matterId).select("id").single();
  if (error) return { ok: false, message: "We could not restore this matter." };
  await logActivity(matterId, permission.profile.id, "restore_matter", "matter", matterId, "Matter restored from archive.", null);
  revalidateMatter(matterId);
  return { ok: true, message: "Matter restored." };
}

export async function submitRestoreMatterAction(formData: FormData) {
  await restoreMatterAction(formData);
}

export async function saveMatterViewAction(formData: FormData): Promise<WorkspaceActionResult> {
  const parsed = parseForm(savedViewSchema, formData);
  if (!parsed.ok) return parsed.result;
  const permission = await requirePermission("view");
  if (!permission.ok) return permission.result;
  const isShared = parsed.data.isShared === "on";
  if (isShared && !canAdminister(permission.profile.role)) {
    return { ok: false, message: "Only a partner or administrator may create shared views." };
  }
  if (!isSupabaseConfigured()) return { ok: true, message: "Saved view recorded in development mode." };
  const supabase = await createClient();
  const configuration = parseMattersQuery(new URLSearchParams(parsed.data.queryString));
  const { error } = await supabase.from("saved_views").insert({
    profile_id: permission.profile.id,
    name: parsed.data.name,
    page: "matters",
    filter_configuration: configuration.q || configuration.view || JSON.stringify(configuration.filters) !== JSON.stringify(defaultMattersQuery.filters) ? configuration : defaultMattersQuery,
    is_shared: isShared,
  });
  if (error) return { ok: false, message: "We could not save this view." };
  revalidatePath("/matters");
  return { ok: true, message: "Saved view created." };
}

export async function submitSaveMatterViewAction(formData: FormData) {
  await saveMatterViewAction(formData);
}

async function addMatterEvent(matterId: string, actorId: string, eventType: string, description: string, occurredAt = new Date().toISOString()) {
  const supabase = await createClient();
  await supabase.from("matter_events").insert({
    matter_id: matterId,
    event_type: eventType,
    occurred_at: occurredAt,
    recorded_by: actorId,
    source: "manual",
    description,
  });
}

async function logActivity(matterId: string, actorId: string, actionType: string, entityType: string, entityId: string | null, description: string, newValue: Json | null) {
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
  revalidatePath("/matters");
  revalidatePath(`/matters/${matterId}`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
