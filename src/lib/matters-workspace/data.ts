import { notFound } from "next/navigation";

import type { Profile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { daysBetweenDates, daysUntilDate } from "@/lib/matters-workspace/labels";
import {
  applySavedView,
  defaultMattersQuery,
  filterMatterItems,
  paginateMatterItems,
  parseMattersQuery,
  sortMatterItems,
} from "@/lib/matters-workspace/query";
import {
  developmentFilterOptions,
  developmentMatterItems,
  getDevelopmentMatterDetail,
  systemSavedViews,
} from "@/lib/matters-workspace/mock";
import type {
  AssessmentLevel,
  DeadlineItem,
  EvidenceItem,
  EvidenceStatus,
  InsuranceStatus,
  IntakeStatus,
  MatterDetail,
  MatterEventSource,
  MatterEventType,
  MatterListItem,
  MatterPermissions,
  MatterStage,
  MatterType,
  MatterWarning,
  MattersListResult,
  MattersQueryState,
  PriorityLevel,
  ProfileRole,
  TaskItem,
  TaskStatus,
  TimelineItem,
  WorkspaceFilterOptions,
  WorkspaceSavedView,
} from "@/lib/matters-workspace/types";

type MatterRow = {
  id: string;
  carrier_id: string | null;
  assigned_adjuster_id: string | null;
  carrier_supervisor_id: string | null;
  matter_name: string;
  carrier_claim_number: string | null;
  firm_matter_number: string | null;
  matter_type: MatterType;
  matter_specific_data: Json;
  date_referred: string | null;
  date_of_loss: string | null;
  jurisdiction: string | null;
  venue: string | null;
  insurance_status: InsuranceStatus;
  amount_paid: string | number | null;
  deductible: string | number | null;
  anticipated_additional_payments: string | number | null;
  recoverable_expenses: string | number | null;
  amount_sought: string | number | null;
  amount_recovered: string | number | null;
  estimated_legal_cost: string | number | null;
  liability_assessment: AssessmentLevel;
  collectability_assessment: AssessmentLevel;
  stage: MatterStage;
  priority: PriorityLevel;
  next_action: string | null;
  next_action_due_date: string | null;
  statute_deadline: string | null;
  statute_deadline_verified: boolean;
  statute_deadline_verified_by: string | null;
  statute_deadline_verified_at: string | null;
  assigned_attorney_id: string | null;
  assigned_staff_id: string | null;
  internal_notes: string | null;
  is_archived: boolean;
  intake_status: IntakeStatus;
  current_intake_step: number;
  last_autosaved_at: string | null;
  current_status_summary: string | null;
  status_summary_updated_at: string | null;
  status_summary_updated_by: string | null;
  closed_at: string | null;
  closed_reason: string | null;
  archived_at: string | null;
  last_substantive_activity_at: string | null;
  created_at: string;
  updated_at: string;
};

type CarrierRow = { id: string; name: string };
type CarrierContactRow = { id: string; carrier_id: string; full_name: string; email: string | null; phone: string | null; department: string | null; contact_type: string };
type ProfileRow = { id: string; full_name: string; role: ProfileRole; job_title: string | null };
type AssignmentRow = { id: string; matter_id: string; profile_id: string; assignment_role: string };
type PartyRow = { id: string; matter_id: string; contact_id: string | null; organization_id: string | null; party_role: string; is_primary: boolean; notes: string | null };
type ContactRow = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null };
type OrganizationRow = { id: string; name: string; email: string | null; phone: string | null };
type EvidenceRow = { id: string; matter_id: string; evidence_type: string; status: EvidenceStatus; date_requested: string | null; date_received: string | null; notes: string | null; updated_at: string };
type EvidenceDocumentLinkRow = { evidence_item_id: string; document_id: string };
type MatterDocumentLinkRow = { id: string; title: string | null; display_filename: string | null };
type DeadlineRow = {
  id: string;
  matter_id: string;
  title: string;
  deadline_type: string;
  deadline_date: string;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  reminder_date: string | null;
  assigned_to: string | null;
  notes: string | null;
};
type TaskRow = {
  id: string;
  matter_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: PriorityLevel;
  status: TaskStatus;
  completed_at: string | null;
  created_by: string | null;
};
type EventRow = {
  id: string;
  matter_id: string;
  event_type: MatterEventType;
  occurred_at: string;
  recorded_by: string | null;
  source: MatterEventSource;
  description: string;
  struck_through_at: string | null;
};
type ActivityRow = {
  id: string;
  matter_id: string | null;
  actor_id: string | null;
  action_type: string;
  entity_type: string;
  description: string;
  created_at: string;
};
type SavedViewRow = { id: string; profile_id: string; name: string; filter_configuration: Json; is_shared: boolean };
type MatterRowsQuery = {
  range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; count: number | null; error: unknown }>;
};

type LookupData = {
  carriers: Map<string, CarrierRow>;
  contacts: Map<string, CarrierContactRow>;
  profiles: Map<string, ProfileRow>;
};

export async function loadMattersWorkspace(input: {
  profile: Profile;
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<{
  result: MattersListResult;
  filterOptions: WorkspaceFilterOptions;
  savedViews: WorkspaceSavedView[];
}> {
  const savedViews = await listWorkspaceSavedViews(input.profile);
  const parsedQuery = parseMattersQuery(input.searchParams);
  const query = applySavedView(parsedQuery, savedViews, input.searchParams);

  if (!isSupabaseConfigured()) {
    const items = filterMatterItems(developmentMatterItems, query, new Date("2026-07-03T12:00:00.000Z"));
    return {
      result: paginateMatterItems(items, query),
      filterOptions: developmentFilterOptions,
      savedViews,
    };
  }

  const [filterOptions, lookup] = await Promise.all([loadWorkspaceFilterOptions(), loadLookupData()]);
  const supabase = await createClient();
  const buildMatterQuery = () => {
    let matterQuery = supabase.from("matters").select("*", { count: "exact" });

    if (query.filters.archivedOnly) matterQuery = matterQuery.eq("is_archived", true);
    else if (!query.filters.archived) matterQuery = matterQuery.eq("is_archived", false);
    if (!query.filters.closed) matterQuery = matterQuery.neq("stage", "closed");
    if (query.filters.carrier) matterQuery = matterQuery.eq("carrier_id", query.filters.carrier);
    if (query.filters.adjuster) matterQuery = matterQuery.eq("assigned_adjuster_id", query.filters.adjuster);
    if (query.filters.matterType) matterQuery = matterQuery.eq("matter_type", query.filters.matterType as MatterType);
    if (query.filters.stage) matterQuery = matterQuery.eq("stage", query.filters.stage as MatterStage);
    if (query.filters.priority) matterQuery = matterQuery.eq("priority", query.filters.priority as PriorityLevel);
    if (query.filters.intakeStatus) matterQuery = matterQuery.eq("intake_status", query.filters.intakeStatus as IntakeStatus);
    if (query.filters.jurisdiction) matterQuery = matterQuery.eq("jurisdiction", query.filters.jurisdiction);
    if (query.filters.attorney) matterQuery = matterQuery.eq("assigned_attorney_id", query.filters.attorney);
    if (query.filters.staff) matterQuery = matterQuery.eq("assigned_staff_id", query.filters.staff);
    if (query.filters.minAmount) matterQuery = matterQuery.gte("amount_sought", query.filters.minAmount);
    if (query.filters.maxAmount) matterQuery = matterQuery.lte("amount_sought", query.filters.maxAmount);
    if (query.filters.amountRecovered) matterQuery = matterQuery.gt("amount_recovered", 0);
    if (query.filters.noAmountSought) matterQuery = matterQuery.eq("amount_sought", "0");
    if (query.filters.nextAction) matterQuery = matterQuery.eq("next_action", query.filters.nextAction);
    if (query.filters.needsAttention) {
      matterQuery = matterQuery.or(
        [
          `next_action_due_date.lt.${today()}`,
          "next_action.is.null",
          `statute_deadline.lte.${addDays(30)}`,
          "statute_deadline_verified.eq.false",
          `last_substantive_activity_at.lt.${addDays(-30)}`,
          "priority.in.(urgent,high)",
          "assigned_adjuster_id.is.null",
          "insurance_status.eq.unknown",
          "liability_assessment.eq.unknown",
        ].join(",")
      );
    }
    if (query.filters.overdueNextAction) matterQuery = matterQuery.lt("next_action_due_date", today());
    if (query.filters.missingNextAction) matterQuery = matterQuery.is("next_action", null);
    if (query.filters.draftIntake) matterQuery = matterQuery.neq("intake_status", "complete");
    if (query.filters.readyForDemand) matterQuery = matterQuery.eq("stage", "ready_for_demand");
    if (query.filters.overdueDeadline) matterQuery = matterQuery.lt("statute_deadline", today());
    if (query.filters.missingStatuteDeadline) matterQuery = matterQuery.is("statute_deadline", null);
    if (query.filters.unverifiedDeadline) matterQuery = matterQuery.eq("statute_deadline_verified", false);
    if (query.filters.deadlineWindow) matterQuery = matterQuery.lte("statute_deadline", addDays(Number(query.filters.deadlineWindow)));
    if (query.filters.missingInformation) {
      matterQuery = matterQuery.or("assigned_adjuster_id.is.null,insurance_status.eq.unknown,liability_assessment.eq.unknown");
    }
    if (query.filters.unknownInsurance) matterQuery = matterQuery.eq("insurance_status", "unknown");
    if (query.filters.unknownLiability) matterQuery = matterQuery.eq("liability_assessment", "unknown");
    return matterQuery;
  };

  const requiresAppPagination = Boolean(query.q) || ["needs_attention", "activity_age", "carrier", "priority"].includes(query.sort);
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  let data: unknown[] | null;
  let count: number | null;
  let error: unknown;

  if (requiresAppPagination) {
    const fetched = await fetchAllMatterRows(() => applySupabaseSort(buildMatterQuery(), "updated_desc"));
    data = fetched.data;
    count = fetched.count;
    error = fetched.error;
  } else {
    // No search term here — Boolean(query.q) is one of the requiresAppPagination triggers above,
    // so a search term always takes the app-pagination branch and is matched against every
    // display column via filterMatterItemsBySearch, not just the few columns a DB-level ilike
    // could reasonably cover.
    const matterQuery = buildMatterQuery();
    const response = await applySupabaseSort(matterQuery, query.sort).range(from, to);
    data = response.data;
    count = response.count;
    error = response.error;
  }

  if (error) {
    return { result: { items: [], totalCount: 0, rangeStart: 0, rangeEnd: 0, query }, filterOptions, savedViews };
  }

  const rows = (data ?? []) as unknown as MatterRow[];
  const related = await loadRelatedForMatters(rows.map((row) => row.id));
  const items = rows.map((row) =>
    mapMatterListItem(row, lookup, related.partiesByMatter.get(row.id) ?? [], related.evidenceByMatter.get(row.id) ?? [], related.contactsById, related.organizationsById)
  );
  if (requiresAppPagination) {
    const searchedItems = query.q ? filterMatterItemsBySearch(items, query.q) : items;
    return {
      result: paginateMatterItems(sortMatterItems(searchedItems, query.sort), query),
      filterOptions,
      savedViews,
    };
  }

  return {
    result: {
      items,
      totalCount: count ?? items.length,
      rangeStart: items.length === 0 ? 0 : from + 1,
      rangeEnd: from + items.length,
      query,
    },
    filterOptions,
    savedViews,
  };
}

export async function loadMatterDetail(id: string, profile: Profile): Promise<MatterDetail> {
  if (!isSupabaseConfigured()) {
    const detail = getDevelopmentMatterDetail(id, profile);
    if (!detail) notFound();
    return detail;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("matters").select("*").eq("id", id).maybeSingle();
  if (error || !data) notFound();

  const row = data as unknown as MatterRow;
  const lookup = await loadLookupData();
  const related = await loadDetailRelated(id);
  const listItem = mapMatterListItem(row, lookup, related.parties, related.evidence, related.contacts, related.organizations);
  const permissions = getMatterPermissions(profile.role);

  return {
    ...listItem,
    carrierId: row.carrier_id,
    assignedAdjusterId: row.assigned_adjuster_id,
    carrierSupervisorName: row.carrier_supervisor_id ? lookup.contacts.get(row.carrier_supervisor_id)?.full_name ?? null : null,
    carrierSupervisorEmail: row.carrier_supervisor_id ? lookup.contacts.get(row.carrier_supervisor_id)?.email ?? null : null,
    carrierSupervisorPhone: row.carrier_supervisor_id ? lookup.contacts.get(row.carrier_supervisor_id)?.phone ?? null : null,
    adjusterEmail: row.assigned_adjuster_id ? lookup.contacts.get(row.assigned_adjuster_id)?.email ?? null : null,
    adjusterPhone: row.assigned_adjuster_id ? lookup.contacts.get(row.assigned_adjuster_id)?.phone ?? null : null,
    adjusterDepartment: row.assigned_adjuster_id ? lookup.contacts.get(row.assigned_adjuster_id)?.department ?? null : null,
    assignedAttorneyId: row.assigned_attorney_id,
    assignedStaffId: row.assigned_staff_id,
    dateReferred: row.date_referred,
    dateOfLoss: row.date_of_loss,
    venue: row.venue,
    adverseInsurer: readMatterSpecificString(row.matter_specific_data, "adverseInsurer"),
    adverseClaimNumber: readMatterSpecificString(row.matter_specific_data, "adverseClaimNumber"),
    adverseAdjuster: readMatterSpecificString(row.matter_specific_data, "adverseAdjuster"),
    liabilitySummary: readMatterSpecificString(row.matter_specific_data, "liabilitySummary"),
    currentStatusSummary: row.current_status_summary,
    statusSummaryUpdatedAt: row.status_summary_updated_at,
    statusSummaryUpdatedByName: row.status_summary_updated_by ? lookup.profiles.get(row.status_summary_updated_by)?.full_name ?? null : null,
    internalNotes: permissions.canViewInternalNotes ? row.internal_notes : null,
    canViewInternalNotes: permissions.canViewInternalNotes,
    amountPaid: numberFrom(row.amount_paid),
    deductible: numberFrom(row.deductible),
    anticipatedAdditionalPayments: numberFrom(row.anticipated_additional_payments),
    recoverableExpenses: numberFrom(row.recoverable_expenses),
    estimatedLegalCost: numberFrom(row.estimated_legal_cost),
    matterSpecificData: jsonObject(row.matter_specific_data),
    assignments: related.assignments.map((assignment) => ({
      id: assignment.id,
      profileId: assignment.profile_id,
      profileName: lookup.profiles.get(assignment.profile_id)?.full_name ?? "Unknown user",
      role: assignment.assignment_role.replaceAll("_", " "),
    })),
    parties: related.parties.map((party) => mapParty(party, related.contacts, related.organizations)),
    evidence: related.evidence.map((item) => mapEvidence(item, related.evidenceDocumentLinksByEvidence.get(item.id) ?? [])),
    deadlines: related.deadlines.map((deadline) => mapDeadline(deadline, lookup.profiles)),
    tasks: related.tasks.map((task) => mapTask(task, lookup.profiles)),
    timeline: [
      ...related.events.map((event) => mapEvent(event, lookup.profiles)),
      ...related.activity.map((activity) => mapActivity(activity, lookup.profiles)),
    ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    permissions,
    closedAt: row.closed_at,
    closedReason: row.closed_reason,
    archivedAt: row.archived_at,
  };
}

export async function listWorkspaceSavedViews(profile: Profile): Promise<WorkspaceSavedView[]> {
  if (!isSupabaseConfigured()) {
    return [
      ...systemSavedViews,
      {
        id: "development-personal-view",
        name: "My Follow-Up",
        scope: "personal",
        description: "Fictional personal view for local development.",
        filterConfiguration: { ...defaultMattersQuery, filters: { ...defaultMattersQuery.filters, overdueNextAction: true } },
        canModify: true,
      },
    ];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_views")
    .select("id,profile_id,name,filter_configuration,is_shared")
    .eq("page", "matters")
    .order("name");

  const rows = (data ?? []) as unknown as SavedViewRow[];
  return [
    ...systemSavedViews,
    ...rows.map((row) => ({
      id: row.id,
      name: row.name,
      scope: row.is_shared ? "shared" as const : "personal" as const,
      description: row.is_shared ? "Shared matter workspace view." : "Personal matter workspace view.",
      filterConfiguration: parseSavedViewConfiguration(row.filter_configuration),
      canModify: row.profile_id === profile.id || profile.role === "admin",
    })),
  ];
}

export async function loadWorkspaceFilterOptions(): Promise<WorkspaceFilterOptions> {
  if (!isSupabaseConfigured()) return developmentFilterOptions;

  const supabase = await createClient();
  const [{ data: carriers }, { data: contacts }, { data: users }, { data: mattersData }] = await Promise.all([
    supabase.from("carriers").select("id,name").eq("is_active", true).order("name"),
    supabase.from("carrier_contacts").select("id,carrier_id,full_name").eq("is_active", true).order("full_name"),
    supabase.from("profiles").select("id,full_name,role").eq("is_active", true).order("full_name"),
    supabase.from("matters").select("jurisdiction,next_action"),
  ]);

  return {
    carriers: ((carriers ?? []) as unknown as CarrierRow[]).map((carrier) => ({ id: carrier.id, name: carrier.name })),
    adjusters: ((contacts ?? []) as unknown as CarrierContactRow[]).map((contact) => ({
      id: contact.id,
      name: contact.full_name,
      carrierId: contact.carrier_id,
    })),
    users: ((users ?? []) as unknown as ProfileRow[]).map((user) => ({ id: user.id, name: user.full_name, role: user.role })),
    jurisdictions: [...new Set(((mattersData ?? []) as unknown as Array<{ jurisdiction: string | null }>).map((matter) => matter.jurisdiction).filter((value): value is string => Boolean(value)))],
    nextActions: [...new Set(((mattersData ?? []) as unknown as Array<{ next_action: string | null }>).map((matter) => matter.next_action).filter((value): value is string => Boolean(value)))],
  };
}

function mapMatterListItem(
  row: MatterRow,
  lookup: LookupData,
  parties: PartyRow[],
  evidence: EvidenceRow[],
  contactsById: Map<string, ContactRow> = new Map(),
  organizationsById: Map<string, OrganizationRow> = new Map()
): MatterListItem {
  const daysSinceActivity = daysBetweenDates(row.last_substantive_activity_at ?? row.updated_at);
  const warnings = buildWarnings(row, parties, evidence, daysSinceActivity);
  const carrier = row.carrier_id ? lookup.carriers.get(row.carrier_id) : null;
  const adjuster = row.assigned_adjuster_id ? lookup.contacts.get(row.assigned_adjuster_id) : null;
  const attorney = row.assigned_attorney_id ? lookup.profiles.get(row.assigned_attorney_id) : null;
  const staff = row.assigned_staff_id ? lookup.profiles.get(row.assigned_staff_id) : null;

  return {
    id: row.id,
    matterName: row.matter_name,
    carrierName: carrier?.name ?? "Unknown carrier",
    carrierClaimNumber: row.carrier_claim_number,
    firmMatterNumber: row.firm_matter_number,
    matterType: row.matter_type,
    intakeStatus: row.intake_status,
    currentIntakeStep: row.current_intake_step,
    lastAutosavedAt: row.last_autosaved_at,
    assignedAdjusterName: adjuster?.full_name ?? null,
    assignedAttorneyId: row.assigned_attorney_id,
    assignedAttorneyName: attorney?.full_name ?? null,
    assignedStaffId: row.assigned_staff_id,
    assignedStaffName: staff?.full_name ?? null,
    assignedFirmUser: attorney?.full_name ?? staff?.full_name ?? "Unassigned",
    amountSought: numberFrom(row.amount_sought),
    amountRecovered: numberFrom(row.amount_recovered),
    stage: row.stage,
    priority: row.priority,
    nextAction: row.next_action,
    nextActionDueDate: row.next_action_due_date,
    statuteDeadline: row.statute_deadline,
    statuteDeadlineVerified: row.statute_deadline_verified,
    daysSinceLastSubstantiveActivity: daysSinceActivity,
    lastSubstantiveActivityAt: row.last_substantive_activity_at,
    lastUpdated: row.updated_at.slice(0, 10),
    jurisdiction: row.jurisdiction,
    insuranceStatus: row.insurance_status,
    liabilityAssessment: row.liability_assessment,
    collectabilityAssessment: row.collectability_assessment,
    isArchived: row.is_archived,
    warnings,
    followUpReasons: warningsToFollowUps(warnings),
    primaryPartyNames: parties
      .filter((party) => party.party_role === "responsible_party" || party.is_primary)
      .map((party) => {
        const contact = party.contact_id ? contactsById.get(party.contact_id) : null;
        if (contact) return `${contact.first_name} ${contact.last_name}`.trim();
        const organization = party.organization_id ? organizationsById.get(party.organization_id) : null;
        return organization?.name ?? "Associated party";
      }),
  };
}

function buildWarnings(row: MatterRow, parties: PartyRow[], evidence: EvidenceRow[], daysSinceActivity: number | null): MatterWarning[] {
  const warnings: MatterWarning[] = [];
  const nextDue = daysUntilDate(row.next_action_due_date);
  const statuteDue = daysUntilDate(row.statute_deadline);
  if (row.intake_status !== "complete") warnings.push("draft_intake");
  if (nextDue !== null && nextDue < 0 && row.stage !== "closed") warnings.push("overdue_next_action");
  if (!row.next_action && row.stage !== "closed") warnings.push("missing_next_action");
  if (statuteDue !== null && statuteDue <= 30 && row.stage !== "closed") warnings.push("deadline_within_30");
  if (row.statute_deadline && !row.statute_deadline_verified) warnings.push("unverified_statute_deadline");
  if ((daysSinceActivity ?? 0) >= 30 && row.stage !== "closed") warnings.push("stale_matter");
  if (!row.assigned_adjuster_id || row.insurance_status === "unknown" || row.liability_assessment === "unknown") warnings.push("missing_information");
  if (!parties.some((party) => party.party_role === "responsible_party")) warnings.push("missing_information");
  if (!evidence.some((item) => item.evidence_type === "payment_ledger" && item.status === "received")) warnings.push("missing_required_evidence");
  return [...new Set(warnings)];
}

function warningsToFollowUps(warnings: MatterWarning[]) {
  return warnings
    .map((warning) => {
      if (warning === "overdue_next_action") return "overdue_next_action";
      if (warning === "missing_next_action") return "missing_next_action";
      if (warning === "stale_matter") return "stale_matter";
      if (warning === "unverified_statute_deadline") return "unverified_statute_deadline";
      if (warning === "deadline_within_30") return "upcoming_deadline";
      return null;
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

function getMatterPermissions(role: ProfileRole): MatterPermissions {
  const internalEditor = ["admin", "partner", "attorney", "staff"].includes(role);
  const legalEditor = ["admin", "partner", "attorney"].includes(role);
  return {
    canEditMatter: internalEditor,
    canManageAssignments: role === "admin" || role === "partner",
    canManageParties: internalEditor,
    canManageEvidence: internalEditor,
    canManageDeadlines: internalEditor,
    canVerifyDeadlines: legalEditor,
    canManageTasks: internalEditor,
    canAddEvents: internalEditor,
    canClose: legalEditor,
    canReopen: legalEditor,
    canArchive: role === "admin" || role === "partner",
    canRestore: role === "admin" || role === "partner",
    canViewInternalNotes: !["billing", "read_only"].includes(role),
    canManageSharedViews: role === "admin" || role === "partner",
  };
}

async function loadLookupData(): Promise<LookupData> {
  const supabase = await createClient();
  const [{ data: carriers }, { data: contacts }, { data: profiles }] = await Promise.all([
    supabase.from("carriers").select("id,name"),
    supabase.from("carrier_contacts").select("id,carrier_id,full_name,email,phone,department,contact_type"),
    supabase.from("profiles").select("id,full_name,role,job_title"),
  ]);
  return {
    carriers: new Map(((carriers ?? []) as unknown as CarrierRow[]).map((row) => [row.id, row])),
    contacts: new Map(((contacts ?? []) as unknown as CarrierContactRow[]).map((row) => [row.id, row])),
    profiles: new Map(((profiles ?? []) as unknown as ProfileRow[]).map((row) => [row.id, row])),
  };
}

async function loadRelatedForMatters(matterIds: string[]) {
  if (matterIds.length === 0) {
    return {
      partiesByMatter: new Map<string, PartyRow[]>(),
      evidenceByMatter: new Map<string, EvidenceRow[]>(),
      contactsById: new Map<string, ContactRow>(),
      organizationsById: new Map<string, OrganizationRow>(),
    };
  }
  const supabase = await createClient();
  const [{ data: parties }, { data: evidence }] = await Promise.all([
    supabase.from("matter_parties").select("*").in("matter_id", matterIds),
    supabase.from("evidence_items").select("*").in("matter_id", matterIds),
  ]);
  const partyRows = (parties ?? []) as unknown as PartyRow[];
  const contactIds = [...new Set(partyRows.map((party) => party.contact_id).filter((id): id is string => Boolean(id)))];
  const organizationIds = [...new Set(partyRows.map((party) => party.organization_id).filter((id): id is string => Boolean(id)))];
  const [{ data: contacts }, { data: organizations }] = await Promise.all([
    contactIds.length > 0
      ? supabase.from("contacts").select("id,first_name,last_name,email,phone").in("id", contactIds)
      : Promise.resolve({ data: [] as ContactRow[] }),
    organizationIds.length > 0
      ? supabase.from("organizations").select("id,name,email,phone").in("id", organizationIds)
      : Promise.resolve({ data: [] as OrganizationRow[] }),
  ]);
  return {
    partiesByMatter: groupBy(partyRows, (row) => row.matter_id),
    evidenceByMatter: groupBy((evidence ?? []) as unknown as EvidenceRow[], (row) => row.matter_id),
    contactsById: new Map(((contacts ?? []) as unknown as ContactRow[]).map((row) => [row.id, row])),
    organizationsById: new Map(((organizations ?? []) as unknown as OrganizationRow[]).map((row) => [row.id, row])),
  };
}

async function loadDetailRelated(matterId: string) {
  const supabase = await createClient();
  const [
    { data: assignments },
    { data: parties },
    { data: evidence },
    { data: deadlines },
    { data: tasks },
    { data: events },
    { data: activity },
    { data: contacts },
    { data: organizations },
  ] = await Promise.all([
    supabase.from("matter_assignments").select("*").eq("matter_id", matterId),
    supabase.from("matter_parties").select("*").eq("matter_id", matterId),
    supabase.from("evidence_items").select("*").eq("matter_id", matterId).order("created_at"),
    supabase.from("deadlines").select("*").eq("matter_id", matterId).order("deadline_date"),
    supabase.from("tasks").select("*").eq("matter_id", matterId).order("due_date"),
    supabase.from("matter_events").select("*").eq("matter_id", matterId).order("occurred_at", { ascending: false }).limit(50),
    supabase.from("activity_logs").select("*").eq("matter_id", matterId).order("created_at", { ascending: false }).limit(50),
    supabase.from("contacts").select("id,first_name,last_name,email,phone"),
    supabase.from("organizations").select("id,name,email,phone"),
  ]);

  const evidenceRows = (evidence ?? []) as unknown as EvidenceRow[];
  const evidenceIds = evidenceRows.map((row) => row.id);
  const { data: evidenceDocumentLinks } = evidenceIds.length > 0
    ? await supabase.from("evidence_document_links").select("evidence_item_id,document_id").in("evidence_item_id", evidenceIds)
    : { data: [] };
  const linkRows = (evidenceDocumentLinks ?? []) as unknown as EvidenceDocumentLinkRow[];
  const documentIds = [...new Set(linkRows.map((row) => row.document_id).filter(Boolean))];
  const { data: linkedDocuments } = documentIds.length > 0
    ? await supabase.from("matter_documents").select("id,title,display_filename").in("id", documentIds)
    : { data: [] };
  const documentsById = new Map(((linkedDocuments ?? []) as unknown as MatterDocumentLinkRow[]).map((row) => [row.id, row]));
  const evidenceDocumentLinksByEvidence = new Map<string, EvidenceItem["documentLinks"]>();
  for (const row of linkRows) {
    const document = documentsById.get(row.document_id);
    evidenceDocumentLinksByEvidence.set(row.evidence_item_id, [
      ...(evidenceDocumentLinksByEvidence.get(row.evidence_item_id) ?? []),
      {
        documentId: row.document_id,
        title: document?.title ?? "Linked document",
        displayFilename: document?.display_filename ?? "Document",
      },
    ]);
  }

  return {
    assignments: (assignments ?? []) as unknown as AssignmentRow[],
    parties: (parties ?? []) as unknown as PartyRow[],
    evidence: evidenceRows,
    evidenceDocumentLinksByEvidence,
    deadlines: (deadlines ?? []) as unknown as DeadlineRow[],
    tasks: (tasks ?? []) as unknown as TaskRow[],
    events: (events ?? []) as unknown as EventRow[],
    activity: (activity ?? []) as unknown as ActivityRow[],
    contacts: new Map(((contacts ?? []) as unknown as ContactRow[]).map((row) => [row.id, row])),
    organizations: new Map(((organizations ?? []) as unknown as OrganizationRow[]).map((row) => [row.id, row])),
  };
}

function mapParty(party: PartyRow, contacts: Map<string, ContactRow>, organizations: Map<string, OrganizationRow>) {
  const contact = party.contact_id ? contacts.get(party.contact_id) : null;
  const organization = party.organization_id ? organizations.get(party.organization_id) : null;
  return {
    id: party.id,
    role: party.party_role.replaceAll("_", " "),
    isPrimary: party.is_primary,
    name: contact ? `${contact.first_name} ${contact.last_name}` : organization?.name ?? "Associated party",
    email: contact?.email ?? organization?.email ?? null,
    phone: contact?.phone ?? organization?.phone ?? null,
    notes: party.notes,
  };
}

function mapEvidence(row: EvidenceRow, documentLinks: EvidenceItem["documentLinks"] = []): EvidenceItem {
  return {
    id: row.id,
    evidenceType: row.evidence_type,
    status: row.status,
    dateRequested: row.date_requested,
    dateReceived: row.date_received,
    notes: row.notes,
    documentLinks,
    updatedAt: row.updated_at,
  };
}

function mapDeadline(row: DeadlineRow, profiles: Map<string, ProfileRow>): DeadlineItem {
  return {
    id: row.id,
    title: row.title,
    deadlineType: row.deadline_type as DeadlineItem["deadlineType"],
    deadlineDate: row.deadline_date,
    isVerified: row.is_verified,
    verifiedByName: row.verified_by ? profiles.get(row.verified_by)?.full_name ?? null : null,
    verifiedAt: row.verified_at,
    assignedToName: row.assigned_to ? profiles.get(row.assigned_to)?.full_name ?? null : null,
    reminderDate: row.reminder_date,
    notes: row.notes,
  };
}

function mapTask(row: TaskRow, profiles: Map<string, ProfileRow>): TaskItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assignedToName: row.assigned_to ? profiles.get(row.assigned_to)?.full_name ?? null : null,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    completedAt: row.completed_at,
    createdByName: row.created_by ? profiles.get(row.created_by)?.full_name ?? null : null,
  };
}

function mapEvent(row: EventRow, profiles: Map<string, ProfileRow>): TimelineItem {
  return {
    id: row.id,
    kind: "event",
    occurredAt: row.occurred_at,
    label: row.event_type.replaceAll("_", " "),
    description: row.description,
    actorName: row.recorded_by ? profiles.get(row.recorded_by)?.full_name ?? null : null,
    actorId: row.recorded_by,
    source: row.source,
    isStruckThrough: Boolean(row.struck_through_at),
  };
}

function mapActivity(row: ActivityRow, profiles: Map<string, ProfileRow>): TimelineItem {
  return {
    id: row.id,
    kind: "activity",
    occurredAt: row.created_at,
    label: row.action_type.replaceAll("_", " "),
    description: row.description,
    actorName: row.actor_id ? profiles.get(row.actor_id)?.full_name ?? null : null,
    actorId: row.actor_id,
    source: "system_activity",
    isStruckThrough: false,
  };
}

function parseSavedViewConfiguration(value: Json): MattersQueryState {
  const object = jsonObject(value);
  if ("q" in object || "filters" in object) {
    return {
      ...defaultMattersQuery,
      ...object,
      filters: { ...defaultMattersQuery.filters, ...(jsonObject(object.filters as Json) as Partial<MattersQueryState["filters"]>) },
    } as MattersQueryState;
  }
  return defaultMattersQuery;
}

type SortableQuery<T> = {
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => T;
};

function applySupabaseSort<T extends SortableQuery<T>>(query: T, sort: string): T {
  if (sort === "updated_asc") return query.order("updated_at", { ascending: true }).order("id", { ascending: true });
  if (sort === "date_referred") return query.order("date_referred", { ascending: false, nullsFirst: false }).order("id", { ascending: true });
  if (sort === "statute_deadline") return query.order("statute_deadline", { ascending: true, nullsFirst: false }).order("id", { ascending: true });
  if (sort === "next_action_due") return query.order("next_action_due_date", { ascending: true, nullsFirst: false }).order("id", { ascending: true });
  if (sort === "amount_sought") return query.order("amount_sought", { ascending: false }).order("id", { ascending: true });
  if (sort === "amount_recovered") return query.order("amount_recovered", { ascending: false }).order("id", { ascending: true });
  if (sort === "matter_name") return query.order("matter_name", { ascending: true }).order("id", { ascending: true });
  // "priority" is intentionally absent here: the column stores strings ("urgent"/"high"/"normal"/
  // "low") whose alphabetical order doesn't match real urgency. requiresAppPagination routes
  // "priority" through fetchAllMatterRows + sortMatterItems (which weighs urgency correctly)
  // instead of reaching this function with that sort value.
  return query.order("updated_at", { ascending: false }).order("id", { ascending: true });
}

async function fetchAllMatterRows(createQuery: () => MatterRowsQuery) {
  const pageSize = 1000;
  const rows: unknown[] = [];
  let count: number | null = null;
  let from = 0;

  while (count === null || rows.length < count) {
    const { data, count: nextCount, error } = await createQuery().range(from, from + pageSize - 1);
    if (error) return { data: rows, count: count ?? nextCount, error };
    const page = data ?? [];
    rows.push(...page);
    count = nextCount ?? rows.length;
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return { data: rows, count: count ?? rows.length, error: null };
}

function filterMatterItemsBySearch(items: MatterListItem[], search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter((matter) =>
    [
      matter.matterName,
      matter.carrierName,
      matter.carrierClaimNumber,
      matter.firmMatterNumber,
      matter.assignedAdjusterName,
      matter.assignedAttorneyName,
      matter.assignedStaffName,
      matter.primaryPartyNames.join(" "),
      matter.nextAction,
    ].some((value) => value?.toLowerCase().includes(q))
  );
}

function readMatterSpecificString(value: Json, key: string) {
  const object = jsonObject(value);
  const draft = jsonObject(object.intake_draft as Json);
  const stepTwo = jsonObject(draft.stepTwo as Json);
  const direct = object[key];
  const fromStepTwo = stepTwo[key];
  return typeof direct === "string" ? direct : typeof fromStepTwo === "string" ? fromStepTwo : null;
}

function jsonObject(value: Json | unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberFrom(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), item]);
  }
  return grouped;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
