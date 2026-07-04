import Link from "next/link";
import type { ReactNode } from "react";
import { PlusCircle } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { StatusBadge } from "@/components/common/status-badge";
import { StatusBadgeList } from "@/components/common/status-badge-list";
import { AddMatterEventForm } from "@/components/matters/add-matter-event-form";
import { EditCurrentStatusSheet } from "@/components/matters/edit-current-status-sheet";
import { MatterDetailWorkspace, type MatterWorkTab } from "@/components/matters/matter-detail-workspace";
import { DateField, MoneyField, SelectField, TextField } from "@/components/matters/matter-form-fields";
import { MatterSummaryStrip } from "@/components/matters/matter-summary-strip";
import { MatterTimeline } from "@/components/matters/matter-timeline";
import { MatterDocumentsPackagesPanel } from "@/components/documents-packages/matter-documents-packages-panel";
import { AssessmentSummaryCards } from "@/components/recovery-assessment/assessment-summary-cards";
import { MatterTriagePanel } from "@/components/triage/matter-triage-panel";
import { TriageSeverityBadge } from "@/components/triage/triage-severity-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireActiveProfile } from "@/lib/auth/session";
import {
  assessmentLabels,
  deadlineTypeLabels,
  evidenceStatusLabels,
  insuranceStatusLabels,
  intakeStatusLabels,
  matterStageLabels,
  matterTypeLabels,
  priorityLabels,
  taskStatusLabels,
} from "@/lib/matters-workspace/labels";
import { loadMatterDetail } from "@/lib/matters-workspace/data";
import { loadActiveMatterFlags, loadRecentResolvedMatterFlags, loadTriageSettings } from "@/lib/triage/data";
import { evaluateMatterTriage, getPrimaryTriageFlag, isSnoozed } from "@/lib/triage/rules";
import { createSnapshotFromDetail } from "@/lib/triage/types";
import { loadMatterAssessmentBundle } from "@/lib/recovery-assessment/data";
import { loadMatterDocumentsAndPackages } from "@/lib/documents-packages/data";
import { permissionsForRole } from "@/lib/documents-packages/types";
import type { MatterAssignment } from "@/lib/matters-workspace/types";
import {
  submitArchiveMatterAction,
  submitCloseMatterAction,
  submitReopenMatterAction,
  submitRestoreMatterAction,
  submitUpdateFinancialsAction,
  submitUpsertDeadlineAction,
  submitUpsertEvidenceAction,
  submitUpsertPartyAction,
  submitUpsertTaskAction,
} from "@/lib/matters-workspace/actions";
import type { MatterStatus } from "@/lib/types";

type MatterDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MatterDetailPage({ params }: MatterDetailPageProps) {
  const { id } = await params;
  const session = await requireActiveProfile();
  const matter = await loadMatterDetail(id, session.profile);
  const { settings } = await loadTriageSettings(session.profile);
  const computedFlags = evaluateMatterTriage(createSnapshotFromDetail(matter), settings).flags;
  const storedFlags = (await loadActiveMatterFlags([matter.id])).get(matter.id) ?? [];
  const storedByRule = new Map(storedFlags.map((flag) => [flag.ruleKey, flag]));
  const activeTriageFlags = computedFlags
    .map((flag) => {
      const stored = storedByRule.get(flag.ruleKey);
      return stored ? { ...flag, id: stored.id, detectedAt: stored.detectedAt, dismissedUntil: stored.dismissedUntil, metadata: { ...flag.metadata, ...stored.metadata } } : flag;
    })
    .filter((flag) => !isSnoozed(flag));
  const resolvedTriageFlags = await loadRecentResolvedMatterFlags(matter.id);
  const assessmentBundle = await loadMatterAssessmentBundle(matter);
  const assessment = assessmentBundle.current ?? assessmentBundle.draft;
  const documentPackageData = await loadMatterDocumentsAndPackages({ matterId: matter.id, profile: session.profile });
  const documentPackagePermissions = permissionsForRole(session.profile.role);
  const primaryTriageFlag = getPrimaryTriageFlag(activeTriageFlags);
  const remaining = Math.max(0, matter.amountSought - matter.amountRecovered);
  const assignedAttorneyNames = assignmentNames(
    matter.assignments,
    ["lead attorney", "assigned attorney"],
    matter.assignedAttorneyName
  );
  const assignedStaffNames = assignmentNames(
    matter.assignments,
    ["assigned staff"],
    matter.assignedStaffName
  );

  const editStatusSheet = (
    <EditCurrentStatusSheet
      currentStatusSummary={matter.currentStatusSummary}
      matterId={matter.id}
      nextAction={matter.nextAction}
      nextActionDueDate={matter.nextActionDueDate}
      priority={matter.priority}
      priorityOptions={Object.entries(priorityLabels)}
      stage={matter.stage}
      stageOptions={Object.entries(matterStageLabels)}
    />
  );

  const tabs: MatterWorkTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="grid gap-6 p-6 xl:grid-cols-2">
            <Section title="Referral Information">
              <Info label="Carrier" value={matter.carrierName} />
              <Info label="Claim number" value={matter.carrierClaimNumber ?? "Not entered"} />
              <Info label="Firm matter number" value={matter.firmMatterNumber ?? "Not entered"} />
              <Info label="Date referred" value={matter.dateReferred ?? "Not entered"} />
              <Info label="Date of loss" value={matter.dateOfLoss ?? "Not entered"} />
              <Info label="Matter type" value={matterTypeLabels[matter.matterType]} />
              <Info label="Jurisdiction" value={matter.jurisdiction ?? "Not entered"} />
              <Info label="Venue" value={matter.venue ?? "Not entered"} />
            </Section>
            <Section title="Carrier Team">
              <Info label="Assigned adjuster" value={matter.assignedAdjusterName ?? "Not assigned"} />
              <Info label="Adjuster email" value={matter.adjusterEmail ?? "Not entered"} />
              <Info label="Adjuster phone" value={matter.adjusterPhone ?? "Not entered"} />
              <Info label="Department" value={matter.adjusterDepartment ?? "Not entered"} />
              <Info label="Carrier supervisor" value={matter.carrierSupervisorName ?? "Not assigned"} />
            </Section>
            <Section title="Firm Team">
              <Info label="Assigned attorneys" value={assignedAttorneyNames} />
              <Info label="Assigned staff" value={assignedStaffNames} />
            </Section>
            <Section title="Liability and Insurance">
              <Info label="Insurance status" value={insuranceStatusLabels[matter.insuranceStatus]} />
              <Info label="Liability assessment" value={assessmentLabels[matter.liabilityAssessment]} />
              <Info label="Collectability" value={assessmentLabels[matter.collectabilityAssessment]} />
              <Info label="Adverse insurer" value={matter.adverseInsurer ?? "Not entered"} />
              <Info label="Adverse claim" value={matter.adverseClaimNumber ?? "Not entered"} />
              <Info label="Liability summary" value={matter.liabilitySummary ?? "Not entered"} />
            </Section>
            <Section title="Matter Parties">
              {matter.parties.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">No parties associated yet.</p>
              ) : (
                matter.parties.map((party) => (
                  <form action={submitUpsertPartyAction} className="rounded-lg border border-border bg-background p-3" key={party.id}>
                    <input name="matterId" type="hidden" value={matter.id} />
                    <input name="partyId" type="hidden" value={party.id} />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{party.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {party.role}
                          {party.isPrimary ? " · Primary" : ""}
                        </p>
                      </div>
                      {matter.permissions.canManageParties ? (
                        <Button size="sm" type="submit" variant="outline">
                          Save
                        </Button>
                      ) : null}
                    </div>
                    {matter.permissions.canManageParties ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <TextField label="Role" name="role" value={party.role.replaceAll(" ", "_")} />
                        <TextField label="Notes" name="notes" value={party.notes ?? ""} />
                        <label className="flex items-center gap-2 text-sm">
                          <input defaultChecked={party.isPrimary} name="isPrimary" type="checkbox" /> Primary
                        </label>
                      </div>
                    ) : null}
                  </form>
                ))
              )}
            </Section>
            {matter.canViewInternalNotes ? (
              <Section title="Internal Notes">
                <p className="py-2 text-sm leading-6 text-muted-foreground">{matter.internalNotes ?? "No internal notes recorded."}</p>
              </Section>
            ) : null}
          </CardContent>
        </Card>
      ),
    },
    {
      value: "work",
      label: "Work",
      hashes: ["attention", "tasks", "deadlines"],
      content: (
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm" id="current-status">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeader title="Current Status" />
                {matter.permissions.canEditMatter ? editStatusSheet : null}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{matter.currentStatusSummary ?? "No status summary has been recorded yet."}</p>
              <dl className="grid gap-x-6 divide-y divide-border rounded-lg bg-secondary/60 px-4 sm:grid-cols-2 sm:divide-y-0">
                <Info label="Stage" value={matterStageLabels[matter.stage]} />
                <Info label="Next action" value={matter.nextAction ?? "Not assigned"} />
                <Info label="Responsible person" value={matter.assignedFirmUser} />
                <Info label="Due date" value={matter.nextActionDueDate ?? "Not set"} />
                <Info label="Last substantive activity" value={matter.lastSubstantiveActivityAt?.slice(0, 10) ?? "Not recorded"} />
                <Info label="Last updated by" value={matter.statusSummaryUpdatedByName ?? "Not recorded"} />
              </dl>
            </CardContent>
          </Card>

          <div id="attention">
            <MatterTriagePanel
              activeFlags={activeTriageFlags}
              matterId={matter.id}
              profile={session.profile}
              resolvedFlags={resolvedTriageFlags}
            />
          </div>

          <Card className="border-border bg-card shadow-sm" id="tasks">
            <CardContent className="space-y-4 p-6">
              <SectionHeader title="Tasks" />
              {matter.tasks.map((task) => (
                <form action={submitUpsertTaskAction} className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(8rem,0.55fr)_minmax(9rem,0.55fr)_minmax(8rem,0.55fr)_minmax(0,1.1fr)_auto]" key={task.id}>
                  <input name="matterId" type="hidden" value={matter.id} />
                  <input name="taskId" type="hidden" value={task.id} />
                  <TextField label="Title" name="title" value={task.title} />
                  <SelectField label="Priority" name="priority" options={Object.entries(priorityLabels)} value={task.priority} />
                  <DateField label="Due date" name="dueDate" value={task.dueDate ?? ""} />
                  <SelectField label="Status" name="status" options={Object.entries(taskStatusLabels)} value={task.status} />
                  <TextField label="Description" name="description" value={task.description ?? ""} />
                  {matter.permissions.canManageTasks ? (
                    <Button className="self-end justify-self-start xl:justify-self-end" type="submit" variant="outline">
                      Save
                    </Button>
                  ) : null}
                </form>
              ))}
              {matter.tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks recorded yet.</p> : null}
              {matter.permissions.canManageTasks ? (
                <form action={submitUpsertTaskAction} className="grid min-w-0 gap-3 rounded-lg border border-dashed border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(8rem,0.5fr)_minmax(9rem,0.5fr)_minmax(8rem,0.5fr)_auto]">
                  <input name="matterId" type="hidden" value={matter.id} />
                  <TextField label="Title" name="title" value="" />
                  <SelectField label="Priority" name="priority" options={Object.entries(priorityLabels)} value="normal" />
                  <DateField label="Due date" name="dueDate" value="" />
                  <SelectField label="Status" name="status" options={Object.entries(taskStatusLabels)} value="not_started" />
                  <Button className="self-end justify-self-start xl:justify-self-end" type="submit">
                    Add Task
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm" id="deadlines">
            <CardContent className="space-y-4 p-6">
              <SectionHeader title="Deadlines" />
              {matter.deadlines.map((deadline) => (
                <form action={submitUpsertDeadlineAction} className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(8rem,0.55fr)_minmax(9rem,0.55fr)_minmax(9rem,0.55fr)_minmax(0,1fr)_auto]" key={deadline.id}>
                  <input name="matterId" type="hidden" value={matter.id} />
                  <input name="deadlineId" type="hidden" value={deadline.id} />
                  <TextField label="Title" name="title" value={deadline.title} />
                  <SelectField label="Type" name="deadlineType" options={Object.entries(deadlineTypeLabels)} value={deadline.deadlineType} />
                  <DateField label="Date" name="deadlineDate" value={deadline.deadlineDate} />
                  <DateField label="Reminder" name="reminderDate" value={deadline.reminderDate ?? ""} />
                  <TextField label="Notes" name="notes" value={deadline.notes ?? ""} />
                  <div className="min-w-0 self-end space-y-2 justify-self-start xl:justify-self-end">
                    {matter.permissions.canVerifyDeadlines ? (
                      <label className="flex items-center gap-2 text-xs">
                        <input defaultChecked={deadline.isVerified} name="verify" type="checkbox" /> Verified
                      </label>
                    ) : null}
                    {matter.permissions.canManageDeadlines ? (
                      <Button type="submit" variant="outline">
                        Save
                      </Button>
                    ) : null}
                  </div>
                </form>
              ))}
              {matter.deadlines.length === 0 ? <p className="text-sm text-muted-foreground">No deadlines recorded yet.</p> : null}
              {matter.permissions.canManageDeadlines ? (
                <form action={submitUpsertDeadlineAction} className="grid min-w-0 gap-3 rounded-lg border border-dashed border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(8rem,0.5fr)_minmax(9rem,0.5fr)_minmax(0,1fr)_auto]">
                  <input name="matterId" type="hidden" value={matter.id} />
                  <TextField label="Title" name="title" value="" />
                  <SelectField label="Type" name="deadlineType" options={Object.entries(deadlineTypeLabels)} value="other" />
                  <DateField label="Date" name="deadlineDate" value="" />
                  <TextField label="Notes" name="notes" value="" />
                  <Button className="self-end justify-self-start xl:justify-self-end" type="submit">
                    Add Deadline
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      value: "financials",
      label: "Financials",
      content: (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="grid gap-6 p-6 xl:grid-cols-[1fr_420px]">
            <Section title="Financial Summary">
              <Info label="Amount paid by carrier" value={<CurrencyDisplay value={matter.amountPaid} />} />
              <Info label="Deductible" value={<CurrencyDisplay value={matter.deductible} />} />
              <Info label="Additional anticipated payments" value={<CurrencyDisplay value={matter.anticipatedAdditionalPayments} />} />
              <Info label="Recoverable expenses" value={<CurrencyDisplay value={matter.recoverableExpenses} />} />
              <Info label="Amount sought" value={<CurrencyDisplay value={matter.amountSought} />} />
              <Info label="Estimated legal cost" value={<CurrencyDisplay value={matter.estimatedLegalCost} />} />
              <Info label="Amount recovered" value={<CurrencyDisplay value={matter.amountRecovered} />} />
              <Info label="Remaining amount sought" value={<CurrencyDisplay value={remaining} />} />
              {assessment ? <Info label="Expected net value" value={<CurrencyDisplay value={assessment.expectedNetValue} />} /> : null}
            </Section>
            {matter.permissions.canEditMatter ? (
              <form action={submitUpdateFinancialsAction} className="grid gap-3 rounded-lg border border-border bg-background p-4">
                <input name="matterId" type="hidden" value={matter.id} />
                <MoneyField label="Amount paid" name="amountPaid" value={matter.amountPaid} />
                <MoneyField label="Deductible" name="deductible" value={matter.deductible} />
                <MoneyField label="Additional payments" name="anticipatedAdditionalPayments" value={matter.anticipatedAdditionalPayments} />
                <MoneyField label="Recoverable expenses" name="recoverableExpenses" value={matter.recoverableExpenses} />
                <MoneyField label="Amount sought" name="amountSought" value={matter.amountSought} />
                <MoneyField label="Estimated legal cost" name="estimatedLegalCost" value={matter.estimatedLegalCost} />
                <MoneyField label="Amount recovered" name="amountRecovered" value={matter.amountRecovered} />
                <Button type="submit">Update Financials</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ),
    },
    {
      value: "evidence",
      label: "Evidence",
      hashes: ["evidence"],
      content: (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="space-y-4 p-6">
            <SectionHeader description="Track evidence status. Document upload will be added in a later phase." title="Evidence" />
            {matter.evidence.map((item) => (
              <form action={submitUpsertEvidenceAction} className="grid gap-3 rounded-lg border border-border bg-background p-4 lg:grid-cols-[1fr_180px_140px_140px_1fr_auto]" key={item.id}>
                <input name="matterId" type="hidden" value={matter.id} />
                <input name="evidenceId" type="hidden" value={item.id} />
                <TextField label="Evidence type" name="evidenceType" value={item.evidenceType} />
                <SelectField label="Status" name="status" options={Object.entries(evidenceStatusLabels)} value={item.status} />
                <DateField label="Requested" name="dateRequested" value={item.dateRequested ?? ""} />
                <DateField label="Received" name="dateReceived" value={item.dateReceived ?? ""} />
                <TextField label="Notes" name="notes" value={item.notes ?? ""} />
                {matter.permissions.canManageEvidence ? (
                  <Button className="self-end" type="submit" variant="outline">
                    Save
                  </Button>
                ) : null}
              </form>
            ))}
            {matter.permissions.canManageEvidence ? (
              <form action={submitUpsertEvidenceAction} className="grid gap-3 rounded-lg border border-dashed border-border bg-background p-4 lg:grid-cols-[1fr_180px_1fr_auto]">
                <input name="matterId" type="hidden" value={matter.id} />
                <TextField label="New evidence type" name="evidenceType" value="other" />
                <SelectField label="Status" name="status" options={Object.entries(evidenceStatusLabels)} value="requested" />
                <TextField label="Notes" name="notes" value="" />
                <Button className="self-end" type="submit">
                  Add Evidence
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ),
    },
    {
      value: "documents-packages",
      label: "Documents & Packages",
      content: (
        <MatterDocumentsPackagesPanel
          documents={documentPackageData.documents}
          evidence={matter.evidence}
          matterAmountSought={matter.amountSought}
          matterId={matter.id}
          packages={documentPackageData.packages}
          permissions={documentPackagePermissions}
          templates={documentPackageData.templates}
        />
      ),
    },
    {
      value: "assessment",
      label: "Assessment",
      content: (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeader description="A structured view of recovery strength, expected value, and how complete the information is. This does not change the matter stage." title="Recovery Assessment" />
              <Button asChild>
                <Link href={`/matters/${matter.id}/assessment`}>{assessment ? "Open Assessment" : "Start Assessment"}</Link>
              </Button>
            </div>
            <AssessmentSummaryCards assessment={assessment} primaryUrgency={primaryTriageFlag} />
            {assessmentBundle.current?.overrideReason ? (
              <div className="rounded-lg bg-[var(--warning-muted)] p-3 text-sm text-[var(--warning)]">
                Attorney override recorded: {assessmentBundle.current.overrideReason}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ),
    },
    {
      value: "activity",
      label: "Activity",
      hashes: ["activity"],
      content: (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="space-y-6 p-6">
            <SectionHeader title="Activity" />
            {matter.permissions.canAddEvents ? <AddMatterEventForm matterId={matter.id} /> : null}
            <MatterTimeline currentProfileId={session.profile.id} isAdmin={session.profile.role === "admin"} items={matter.timeline} matterId={matter.id} />
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            {matter.permissions.canEditMatter ? editStatusSheet : null}
            <Button asChild className="h-10 gap-2" variant="outline">
              <a href="#tasks">
                <PlusCircle aria-hidden="true" className="size-4" />
                Add Task
              </a>
            </Button>
            <Button asChild className="h-10 gap-2" variant="outline">
              <a href="#deadlines">Add Deadline</a>
            </Button>
          </>
        }
        subtitle={`${matter.carrierName} · Claim ${matter.carrierClaimNumber ?? "No claim number"}${matter.firmMatterNumber ? ` · ${matter.firmMatterNumber}` : ""} · ${matter.assignedAttorneyName ?? "Unassigned attorney"}`}
        title={matter.matterName}
      />

      <StatusBadgeList
        items={[
          ...(primaryTriageFlag ? [{ key: "severity", node: <TriageSeverityBadge severity={primaryTriageFlag.severity} /> }] : []),
          { key: "stage", node: <StatusBadge status={matterStageLabels[matter.stage] as MatterStatus} /> },
          { key: "priority", node: <StatusBadge status={priorityLabels[matter.priority] as MatterStatus} /> },
          {
            key: "deadline",
            node: matter.statuteDeadlineVerified ? <StatusBadge status="Deadline verified" /> : <StatusBadge status="Unverified statute deadline" />,
          },
          { key: "type", node: <StatusBadge status={matterTypeLabels[matter.matterType] as MatterStatus} /> },
          { key: "intake", node: <StatusBadge status={intakeStatusLabels[matter.intakeStatus] as MatterStatus} /> },
        ]}
        max={3}
      />

      {matter.intakeStatus !== "complete" ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              This intake is incomplete. Step {matter.currentIntakeStep} of 3 was last saved {matter.lastAutosavedAt ? matter.lastAutosavedAt.slice(0, 10) : "recently"}.
            </p>
            <Button asChild>
              <Link href={`/matters/${matter.id}/intake`}>Resume Intake</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <MatterSummaryStrip
        fields={[
          { label: "Amount sought", value: <CurrencyDisplay value={matter.amountSought} /> },
          { label: "Amount recovered", value: <CurrencyDisplay value={matter.amountRecovered} /> },
          { label: "Statute deadline", value: matter.statuteDeadline ? <DateDisplay value={matter.statuteDeadline} /> : "Not entered" },
          { label: "Next action", value: matter.nextAction ?? "Not assigned" },
          { label: "Responsible person", value: matter.assignedFirmUser },
          { label: "Current stage", value: matterStageLabels[matter.stage] },
          { label: "Viability", value: assessment ? `${assessment.viabilityScore}/100` : "Not started" },
          { label: "Expected net value", value: assessment ? <CurrencyDisplay value={assessment.expectedNetValue} /> : "Not started" },
          { label: "Completeness", value: assessment ? `${assessment.dataCompletenessPercentage}%` : "Not started" },
        ]}
      />

      <MatterDetailWorkspace
        defaultTab={activeTriageFlags.length > 0 ? "work" : "overview"}
        dueDate={primaryTriageFlag?.relevantDate ? <DateDisplay value={primaryTriageFlag.relevantDate} /> : "Not set"}
        mostCriticalExplanation={primaryTriageFlag?.explanation ?? null}
        mostCriticalTitle={
          activeTriageFlags.length === 0
            ? "This matter has no open triage issues right now."
            : (primaryTriageFlag?.title ?? "Review the flagged issues on this matter.")
        }
        openIssueCount={activeTriageFlags.length}
        responsibleUser={primaryTriageFlag?.relevantUser ?? matter.assignedFirmUser}
        reviewAllTab="work"
        tabs={tabs}
      />

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="link">
            <Link href="/matters">Back to matters</Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            {matter.stage !== "closed" && matter.permissions.canClose ? (
              <form action={submitCloseMatterAction} className="flex flex-wrap gap-2">
                <input name="matterId" type="hidden" value={matter.id} />
                <input name="reason" type="hidden" value="Other" />
                <input name="closingDate" type="hidden" value={new Date().toISOString().slice(0, 10)} />
                <input name="note" type="hidden" value="Closed from matter detail." />
                <Button type="submit" variant="outline">
                  Close Matter
                </Button>
              </form>
            ) : null}
            {matter.stage === "closed" && matter.permissions.canReopen ? (
              <form action={submitReopenMatterAction} className="flex flex-wrap gap-2">
                <input name="matterId" type="hidden" value={matter.id} />
                <input name="reason" type="hidden" value="Reopened for additional recovery work" />
                <input name="stage" type="hidden" value="investigation" />
                <input name="nextAction" type="hidden" value="Review reopened matter" />
                <input name="nextActionDueDate" type="hidden" value={new Date().toISOString().slice(0, 10)} />
                <input name="responsibleUser" type="hidden" value={matter.assignedAttorneyId ?? matter.assignedStaffId ?? ""} />
                <Button type="submit" variant="outline">
                  Reopen Matter
                </Button>
              </form>
            ) : null}
            {matter.isArchived && matter.permissions.canRestore ? (
              <form action={submitRestoreMatterAction}>
                <input name="matterId" type="hidden" value={matter.id} />
                <Button type="submit" variant="outline">
                  Restore Matter
                </Button>
              </form>
            ) : matter.permissions.canArchive ? (
              <form action={submitArchiveMatterAction}>
                <input name="matterId" type="hidden" value={matter.id} />
                <Button type="submit" variant="outline">
                  Archive Matter
                </Button>
              </form>
            ) : null}
            {matter.intakeStatus !== "complete" ? (
              <Button asChild>
                <Link href={`/matters/${matter.id}/intake`}>Resume Intake</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      <dl className="divide-y divide-border rounded-lg bg-secondary/60 px-4">{children}</dl>
    </section>
  );
}

function assignmentNames(assignments: MatterAssignment[], roleNames: string[], fallback?: string | null) {
  const normalizedRoles = new Set(roleNames.map((role) => role.toLowerCase()));
  const names = [
    fallback,
    ...assignments
      .filter((assignment) => normalizedRoles.has(assignment.role.toLowerCase()))
      .map((assignment) => assignment.profileName),
  ].filter((name): name is string => Boolean(name));
  return [...new Set(names)].join(", ") || "Not assigned";
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground sm:text-right">{value}</dd>
    </div>
  );
}
