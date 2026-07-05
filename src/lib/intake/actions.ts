"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile, type ProfileRole } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  intakeSchema,
  intakeStepOneSchema,
  type IntakeFormData,
} from "@/lib/intake/schema";
import { getIntakeOptions } from "@/lib/intake/options";
import type { Json } from "@/lib/supabase/database.types";

export type IntakeActionResult =
  | {
      ok: true;
      matterId: string;
      savedAt: string;
      redirectTo?: string;
      message?: string;
      duplicateMatches?: DuplicateMatterMatch[];
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string>;
      duplicateMatches?: DuplicateMatterMatch[];
    };

export type DuplicateMatterMatch = {
  id: string;
  name: string;
  claimNumber: string | null;
  status: "draft" | "in_progress" | "complete";
};

type CancelIntakeMode = "archive" | "delete";

export type AddCarrierResult =
  | {
      ok: true;
      carrier: {
        id: string;
        name: string;
        shortName: string | null;
      };
    }
  | {
      ok: false;
      message: string;
    };

function canCreateMatter(role: ProfileRole) {
  return ["admin", "partner", "attorney", "staff"].includes(role);
}

function canVerifyDeadline(role: ProfileRole) {
  return ["admin", "partner", "attorney"].includes(role);
}

function zodErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Check this field."])
  );
}

function toJson(data: IntakeFormData): Json {
  return JSON.parse(JSON.stringify({ intake_draft: data }));
}

function normalizeAmount(value: string | undefined) {
  return value && value.trim() ? value : "0.00";
}

function uniqueIds(ids: Array<string | undefined>) {
  return [...new Set(ids.map((id) => id?.trim() ?? "").filter(Boolean))];
}

function assignedAttorneyIds(data: IntakeFormData["stepOne"]) {
  return uniqueIds([...(data.assignedAttorneyIds ?? []), data.assignedAttorneyId]);
}

function assignedStaffIds(data: IntakeFormData["stepOne"]) {
  return uniqueIds([...(data.assignedStaffIds ?? []), data.assignedStaffId]);
}

type MatterAssignmentRow = {
  matter_id: string;
  profile_id: string;
  assignment_role: "lead_attorney" | "assigned_staff";
};

type MatterPartyRow = {
  matter_id: string;
  contact_id: string | null;
  organization_id: string | null;
  party_role: string;
  is_primary: boolean;
  notes: string | null;
};

async function requireIntakePermission(): Promise<{ ok: true; profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>> } | { ok: false; message: string }> {
  const profile = await getCurrentProfile();

  if (!profile) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  if (!profile.is_active) {
    return { ok: false, message: "Your account is inactive. Contact an administrator." };
  }

  if (!canCreateMatter(profile.role)) {
    return { ok: false, message: "You do not have permission to create matters." };
  }

  return { ok: true, profile };
}

async function validateRelationships(data: IntakeFormData) {
  const options = await getIntakeOptions();
  const carrier = options.carriers.find((item) => item.id === data.stepOne.carrierId);

  if (!carrier) {
    return "Select an active carrier.";
  }

  const selectedAdjuster = data.stepOne.assignedAdjusterId
    ? options.carrierContacts.find((item) => item.id === data.stepOne.assignedAdjusterId)
    : null;

  if (selectedAdjuster && selectedAdjuster.carrierId !== data.stepOne.carrierId) {
    return "The selected adjuster does not belong to the selected carrier.";
  }

  const responsibleUserId =
    data.stepThree.nextActionAssignedTo ||
    assignedAttorneyIds(data.stepOne)[0] ||
    assignedStaffIds(data.stepOne)[0];

  if (!options.users.some((user) => user.id === responsibleUserId)) {
    return "Select an active internal user for the next action.";
  }

  return null;
}

export async function checkDuplicateMattersAction(input: {
  carrierId: string;
  carrierClaimNumber: string;
  dateOfLoss?: string;
  matterName?: string;
}): Promise<DuplicateMatterMatch[]> {
  if (!input.carrierId || !input.carrierClaimNumber) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    if (input.carrierClaimNumber.toUpperCase().includes("NSM-48291")) {
      return [
        {
          id: "northstar-collins-claim",
          name: "Northstar Mutual v. Collins",
          claimNumber: "NSM-48291-26",
          status: "complete",
        },
      ];
    }
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("matters")
    .select("id,matter_name,carrier_claim_number,intake_status")
    .eq("carrier_id", input.carrierId)
    .ilike("carrier_claim_number", input.carrierClaimNumber);

  return (
    data?.map((matter) => ({
      id: String(matter.id),
      name: String(matter.matter_name),
      claimNumber: matter.carrier_claim_number ? String(matter.carrier_claim_number) : null,
      status: (matter.intake_status as DuplicateMatterMatch["status"]) ?? "complete",
    })) ?? []
  );
}

export async function saveIntakeDraftAction(input: {
  matterId?: string;
  data: IntakeFormData;
  step: number;
  exit?: boolean;
  lastKnownAutosavedAt?: string;
}): Promise<IntakeActionResult> {
  const stepOne = intakeStepOneSchema.safeParse(input.data.stepOne);

  if (!stepOne.success) {
    return {
      ok: false,
      message: "Complete the required Matter Details fields before saving a database draft.",
      fieldErrors: zodErrors(stepOne.error),
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      matterId: input.matterId || "development-intake-draft",
      savedAt: new Date().toISOString(),
      redirectTo: input.exit ? "/matters?draftSaved=1" : undefined,
      message: "Saved locally. Connect Supabase to persist database drafts.",
    };
  }

  const permission = await requireIntakePermission();
  if (!permission.ok) {
    return permission;
  }

  const relationshipError = await validateRelationships(input.data);
  if (relationshipError) {
    return { ok: false, message: relationshipError };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const attorneyIds = assignedAttorneyIds(input.data.stepOne);
  const staffIds = assignedStaffIds(input.data.stepOne);
  const matterValues = {
    carrier_id: input.data.stepOne.carrierId,
    assigned_adjuster_id: input.data.stepOne.assignedAdjusterId || null,
    carrier_supervisor_id: input.data.stepOne.carrierSupervisorId || null,
    matter_name: input.data.stepOne.matterName,
    carrier_claim_number: input.data.stepOne.carrierClaimNumber,
    firm_matter_number: input.data.stepOne.firmMatterNumber || null,
    matter_type: input.data.stepOne.matterType,
    matter_specific_data: toJson(input.data),
    date_referred: input.data.stepOne.dateReferred,
    date_of_loss: input.data.stepOne.dateOfLoss || null,
    jurisdiction: input.data.stepOne.jurisdiction || null,
    venue: input.data.stepOne.venue || null,
    assigned_attorney_id: attorneyIds[0] ?? null,
    assigned_staff_id: staffIds[0] ?? null,
    created_by: permission.profile.id,
    intake_status: input.step > 1 ? "in_progress" : "draft",
    current_intake_step: Math.max(1, Math.min(3, input.step)),
    last_autosaved_at: now,
  };

  const query = input.matterId
    ? (() => {
        let updateQuery = supabase.from("matters").update(matterValues).eq("id", input.matterId);
        if (input.lastKnownAutosavedAt) updateQuery = updateQuery.eq("last_autosaved_at", input.lastKnownAutosavedAt);
        return updateQuery.select("id").maybeSingle();
      })()
    : supabase.from("matters").insert(matterValues).select("id").single();

  const { data, error } = await query;

  if (error || !data) {
    if (input.matterId && input.lastKnownAutosavedAt) {
      return { ok: false, message: "This intake draft was changed in another tab. Refresh before saving so you do not overwrite newer work." };
    }
    return { ok: false, message: "We could not save this intake draft." };
  }

  const matterId = String(data.id);

  await supabase.from("activity_logs").insert({
    matter_id: matterId,
    actor_id: permission.profile.id,
    action_type: input.matterId ? "autosave" : "create",
    entity_type: "matter_intake",
    entity_id: matterId,
    description: input.matterId ? "Intake draft autosaved." : "Intake draft created.",
    new_value: { current_intake_step: input.step, intake_status: input.step > 1 ? "in_progress" : "draft" },
  });

  revalidatePath("/matters");

  return {
    ok: true,
    matterId,
    savedAt: now,
    redirectTo: input.exit ? "/matters?draftSaved=1" : undefined,
    message: input.exit ? "Draft saved." : "Saved.",
  };
}

export async function completeIntakeAction(input: {
  matterId?: string;
  data: IntakeFormData;
  acknowledgedDuplicate?: boolean;
}): Promise<IntakeActionResult> {
  const parsed = intakeSchema.safeParse(input.data);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Review the highlighted fields before completing intake.",
      fieldErrors: zodErrors(parsed.error),
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Connect Supabase before completing a database-backed intake.",
    };
  }

  const permission = await requireIntakePermission();
  if (!permission.ok) {
    return permission;
  }

  if (input.data.stepThree.verifyStatuteDeadline && !canVerifyDeadline(permission.profile.role)) {
    return { ok: false, message: "Only an attorney, partner, or administrator may verify a statute deadline." };
  }

  const relationshipError = await validateRelationships(input.data);
  if (relationshipError) {
    return { ok: false, message: relationshipError };
  }

  const duplicateMatches = await checkDuplicateMattersAction({
    carrierId: input.data.stepOne.carrierId,
    carrierClaimNumber: input.data.stepOne.carrierClaimNumber,
    dateOfLoss: input.data.stepOne.dateOfLoss,
    matterName: input.data.stepOne.matterName,
  });

  const duplicateMatchesExcludingSelf = duplicateMatches.filter((match) => match.id !== input.matterId);
  if (duplicateMatchesExcludingSelf.length > 0 && !input.acknowledgedDuplicate) {
    return {
      ok: false,
      message: "Possible duplicate matters were found. Review them before completing intake.",
      duplicateMatches: duplicateMatchesExcludingSelf,
    };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const attorneyIds = assignedAttorneyIds(input.data.stepOne);
  const staffIds = assignedStaffIds(input.data.stepOne);
  const nextActionTitle =
    input.data.stepThree.nextAction === "Complete initial review" && input.data.stepThree.customNextAction
      ? input.data.stepThree.customNextAction
      : input.data.stepThree.customNextAction || input.data.stepThree.nextAction;

  const matterValues = {
    carrier_id: input.data.stepOne.carrierId,
    assigned_adjuster_id: input.data.stepOne.assignedAdjusterId || null,
    carrier_supervisor_id: input.data.stepOne.carrierSupervisorId || null,
    matter_name: input.data.stepOne.matterName,
    carrier_claim_number: input.data.stepOne.carrierClaimNumber,
    firm_matter_number: input.data.stepOne.firmMatterNumber || null,
    matter_type: input.data.stepOne.matterType,
    matter_specific_data: toJson(input.data),
    date_referred: input.data.stepOne.dateReferred,
    date_of_loss: input.data.stepOne.dateOfLoss || null,
    jurisdiction: input.data.stepOne.jurisdiction || null,
    venue: input.data.stepOne.venue || null,
    insurance_status: input.data.stepTwo.insuranceStatus,
    amount_paid: normalizeAmount(input.data.stepTwo.amountPaid),
    deductible: normalizeAmount(input.data.stepTwo.deductible),
    anticipated_additional_payments: normalizeAmount(input.data.stepTwo.anticipatedAdditionalPayments),
    recoverable_expenses: normalizeAmount(input.data.stepTwo.recoverableExpenses),
    amount_sought: normalizeAmount(input.data.stepTwo.amountSought),
    estimated_legal_cost: normalizeAmount(input.data.stepTwo.estimatedLegalCost),
    liability_assessment: input.data.stepTwo.liabilityAssessment,
    collectability_assessment: input.data.stepTwo.collectabilityAssessment,
    priority: input.data.stepThree.priority,
    stage: input.data.stepThree.stage,
    next_action: nextActionTitle,
    next_action_due_date: input.data.stepThree.nextActionDueDate,
    statute_deadline: input.data.stepThree.statuteDeadline || null,
    statute_deadline_verified: input.data.stepThree.verifyStatuteDeadline,
    statute_deadline_verified_by: input.data.stepThree.verifyStatuteDeadline ? permission.profile.id : null,
    statute_deadline_verified_at: input.data.stepThree.verifyStatuteDeadline ? now : null,
    assigned_attorney_id: attorneyIds[0] ?? null,
    assigned_staff_id: staffIds[0] ?? null,
    internal_notes: input.data.stepThree.internalNotes || null,
    created_by: permission.profile.id,
    intake_status: "complete",
    current_intake_step: 3,
    last_autosaved_at: now,
    referral_received_at: input.data.stepOne.dateReferred,
    last_substantive_activity_at: now,
  };

  const saveMatter = input.matterId
    ? supabase.from("matters").update(matterValues).eq("id", input.matterId).select("id").single()
    : supabase.from("matters").insert(matterValues).select("id").single();

  const { data: matter, error: matterError } = await saveMatter;

  if (matterError || !matter) {
    return { ok: false, message: "We could not complete this matter intake." };
  }

  const matterId = String(matter.id);

  const assignmentRows: MatterAssignmentRow[] = [
    ...attorneyIds.map((profileId) => ({ matter_id: matterId, profile_id: profileId, assignment_role: "lead_attorney" as const })),
    ...staffIds.map((profileId) => ({ matter_id: matterId, profile_id: profileId, assignment_role: "assigned_staff" as const })),
  ];

  await Promise.all([
    supabase.from("matter_assignments").delete().eq("matter_id", matterId),
    supabase.from("evidence_items").delete().eq("matter_id", matterId),
    supabase.from("matter_parties").delete().eq("matter_id", matterId),
  ]);

  const evidenceRows = input.data.stepTwo.evidence
    .filter((item) => item.status !== "not_applicable" || item.notes)
    .map((item) => ({
      matter_id: matterId,
      evidence_type: item.evidenceType,
      status: item.status,
      notes: item.notes || null,
      created_by: permission.profile.id,
      date_received: item.status === "received" ? new Date().toISOString().slice(0, 10) : null,
      date_requested: item.status === "requested" || item.status === "missing" ? new Date().toISOString().slice(0, 10) : null,
    }));

  const partyRows: MatterPartyRow[] = [];
  for (const party of input.data.stepTwo.parties) {
    let contactId = party.mode === "contact" ? party.contactId || null : null;
    let organizationId = party.mode === "organization" ? party.organizationId || null : null;

    if (party.mode === "contact" && !contactId && party.firstName && party.lastName) {
      const { data: contact } = await supabase
        .from("contacts")
        .insert({
          first_name: party.firstName,
          last_name: party.lastName,
        })
        .select("id")
        .single();
      contactId = contact?.id ? String(contact.id) : null;
    }

    if (party.mode === "organization" && !organizationId && party.organizationName) {
      const { data: organization } = await supabase
        .from("organizations")
        .insert({
          name: party.organizationName,
          organization_type: "business",
        })
        .select("id")
        .single();
      organizationId = organization?.id ? String(organization.id) : null;
    }

    if (contactId || organizationId) {
      partyRows.push({
        matter_id: matterId,
        contact_id: contactId,
        organization_id: organizationId,
        party_role: party.role,
        is_primary: party.isPrimary,
        notes: party.notes || null,
      });
    }
  }

  const { data: existingTask } = await supabase
    .from("tasks")
    .select("id")
    .eq("matter_id", matterId)
    .eq("title", nextActionTitle)
    .maybeSingle();

  await Promise.all([
    assignmentRows.length > 0
      ? supabase.from("matter_assignments").insert(assignmentRows)
      : Promise.resolve(),
    evidenceRows.length > 0 ? supabase.from("evidence_items").insert(evidenceRows) : Promise.resolve(),
    partyRows.length > 0 ? supabase.from("matter_parties").insert(partyRows) : Promise.resolve(),
    supabase.from("deadlines").insert({
      matter_id: matterId,
      deadline_type: "statute_of_limitations",
      title: "Statute of limitations",
      deadline_date: input.data.stepThree.statuteDeadline || input.data.stepThree.nextActionDueDate,
      is_verified: input.data.stepThree.verifyStatuteDeadline,
      verified_by: input.data.stepThree.verifyStatuteDeadline ? permission.profile.id : null,
      verified_at: input.data.stepThree.verifyStatuteDeadline ? now : null,
      reminder_date: input.data.stepThree.reminderDate || null,
      assigned_to: input.data.stepThree.deadlineAssignedTo || input.data.stepThree.nextActionAssignedTo,
      created_by: permission.profile.id,
      notes: input.data.stepThree.statuteDeadline ? null : "Deadline remains unknown and requires immediate review.",
    }),
    existingTask
      ? Promise.resolve()
      : supabase.from("tasks").insert({
          matter_id: matterId,
          title: nextActionTitle,
          assigned_to: input.data.stepThree.nextActionAssignedTo,
          due_date: input.data.stepThree.nextActionDueDate,
          priority: input.data.stepThree.priority,
          status: "not_started",
          created_by: permission.profile.id,
        }),
    supabase.from("matter_events").insert([
      {
        matter_id: matterId,
        event_type: "referral_received",
        occurred_at: input.data.stepOne.dateReferred,
        recorded_by: permission.profile.id,
        source: "manual",
        description: "Referral received through intake.",
      },
      {
        matter_id: matterId,
        event_type: "other",
        occurred_at: now,
        recorded_by: permission.profile.id,
        source: "manual",
        description: "Matter intake completed.",
      },
    ]),
    supabase.from("activity_logs").insert({
      matter_id: matterId,
      actor_id: permission.profile.id,
      action_type: "complete",
      entity_type: "matter_intake",
      entity_id: matterId,
      description: "Matter intake completed.",
      new_value: { intake_status: "complete", current_intake_step: 3 },
    }),
  ]);

  revalidatePath("/matters");
  revalidatePath(`/matters/${matterId}`);

  return {
    ok: true,
    matterId,
    savedAt: now,
    redirectTo: `/matters/${matterId}?created=1`,
    message: "Matter created successfully.",
  };
}

export async function addCarrierContactAction(input: {
  carrierId: string;
  fullName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  contactType: string;
  supervisorContactId?: string;
}): Promise<{ ok: true; contactId: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: true, contactId: `development-contact-${Date.now()}` };
  }

  const permission = await requireIntakePermission();
  if (!permission.ok) {
    return permission;
  }

  const options = await getIntakeOptions();
  if (!options.permission.canAddCarrierContact) {
    return { ok: false, message: "You do not have permission to add carrier contacts." };
  }

  if (!options.carriers.some((carrier) => carrier.id === input.carrierId)) {
    return { ok: false, message: "Select a valid carrier before adding a contact." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("carrier_contacts")
    .insert({
      carrier_id: input.carrierId,
      full_name: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      job_title: input.jobTitle || null,
      department: input.department || null,
      contact_type: input.contactType || "adjuster",
      supervisor_contact_id: input.supervisorContactId || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: "We could not add this carrier contact." };
  }

  return { ok: true, contactId: String(data.id) };
}

export async function addCarrierAction(input: {
  name: string;
  shortName?: string;
}): Promise<AddCarrierResult> {
  const name = input.name.trim();
  const shortName = input.shortName?.trim() ?? "";

  if (name.length < 2) {
    return { ok: false, message: "Enter the carrier name." };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      carrier: {
        id: `development-carrier-${Date.now()}`,
        name,
        shortName: shortName || null,
      },
    };
  }

  const permission = await requireIntakePermission();
  if (!permission.ok) {
    return permission;
  }

  const options = await getIntakeOptions();
  if (!options.permission.canAddCarrier) {
    return { ok: false, message: "You do not have permission to add carriers." };
  }

  const supabase = await createClient();
  const { data: existingCarrier } = await supabase
    .from("carriers")
    .select("id,name,short_name")
    .eq("is_active", true)
    .ilike("name", name)
    .maybeSingle();

  if (existingCarrier) {
    return {
      ok: true,
      carrier: {
        id: String(existingCarrier.id),
        name: String(existingCarrier.name),
        shortName: existingCarrier.short_name ? String(existingCarrier.short_name) : null,
      },
    };
  }

  const { data, error } = await supabase
    .from("carriers")
    .insert({
      name,
      short_name: shortName || null,
      is_active: true,
    })
    .select("id,name,short_name")
    .single();

  if (error || !data) {
    return { ok: false, message: "We could not add this carrier." };
  }

  revalidatePath("/matters/new");

  return {
    ok: true,
    carrier: {
      id: String(data.id),
      name: String(data.name),
      shortName: data.short_name ? String(data.short_name) : null,
    },
  };
}

export async function getIntakeDraft(matterId: string): Promise<{ data: IntakeFormData; lastAutosavedAt: string | null } | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.from("matters").select("matter_specific_data,last_autosaved_at").eq("id", matterId).maybeSingle();
  const raw = data?.matter_specific_data as { intake_draft?: unknown } | null | undefined;
  const parsed = intakeSchema.safeParse(raw?.intake_draft);

  return parsed.success ? { data: parsed.data, lastAutosavedAt: data?.last_autosaved_at ? String(data.last_autosaved_at) : null } : null;
}

export async function cancelIntakeAction(input?: { matterId?: string; mode?: CancelIntakeMode }): Promise<IntakeActionResult> {
  const matterId = input?.matterId;
  const mode = input?.mode ?? "archive";
  if (!matterId || !isSupabaseConfigured()) {
    return {
      ok: true,
      matterId: matterId ?? "development-intake-draft",
      savedAt: new Date().toISOString(),
      redirectTo: "/matters",
      message: mode === "delete" ? "Draft deleted." : "Draft preserved and archived.",
    };
  }

  const permission = await requireIntakePermission();
  if (!permission.ok) {
    return permission;
  }

  const supabase = await createClient();
  const { data: matter, error: matterError } = await supabase
    .from("matters")
    .select("id,intake_status")
    .eq("id", matterId)
    .maybeSingle();

  if (matterError || !matter) {
    return { ok: false, message: "We could not find this intake draft." };
  }

  if (matter.intake_status === "complete") {
    return { ok: false, message: "Completed matters cannot be deleted from intake cancellation." };
  }

  if (mode === "delete") {
    const relatedDeletes = await Promise.all([
      supabase.from("activity_logs").delete().eq("matter_id", matterId),
      supabase.from("matter_assignments").delete().eq("matter_id", matterId),
      supabase.from("evidence_items").delete().eq("matter_id", matterId),
      supabase.from("matter_parties").delete().eq("matter_id", matterId),
      supabase.from("deadlines").delete().eq("matter_id", matterId),
      supabase.from("tasks").delete().eq("matter_id", matterId),
      supabase.from("matter_events").delete().eq("matter_id", matterId),
    ]);
    const relatedError = relatedDeletes.find((result) => result.error)?.error;
    if (relatedError) {
      return { ok: false, message: "We could not delete this intake draft." };
    }

    const { error } = await supabase.from("matters").delete().eq("id", matterId);
    if (error) {
      return { ok: false, message: "We could not delete this intake draft." };
    }

    return { ok: true, matterId, savedAt: new Date().toISOString(), redirectTo: "/matters", message: "Draft deleted." };
  }

  const { error } = await supabase
    .from("matters")
    .update({ is_archived: true, intake_status: "draft", archived_at: new Date().toISOString(), archived_by: permission.profile.id })
    .eq("id", matterId)
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: "We could not cancel this intake." };
  }

  return { ok: true, matterId, savedAt: new Date().toISOString(), redirectTo: "/matters", message: "Draft preserved and archived." };
}
