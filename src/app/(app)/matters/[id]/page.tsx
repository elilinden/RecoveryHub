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
import { DateField, MoneyField, SelectField, TextAreaField, TextField } from "@/components/matters/matter-form-fields";
import { CloseMatterDialog, ReopenMatterDialog } from "@/components/matters/matter-lifecycle-dialogs";
import { MatterSummaryStrip } from "@/components/matters/matter-summary-strip";
import { MatterTimeline } from "@/components/matters/matter-timeline";
import { MatterDocumentsPackagesPanel } from "@/components/documents-packages/matter-documents-packages-panel";
import { AssessmentSummaryCards } from "@/components/recovery-assessment/assessment-summary-cards";
import { MatterTriagePanel } from "@/components/triage/matter-triage-panel";
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
import type { MatterAssignment, MatterDetail } from "@/lib/matters-workspace/types";
import {
  submitArchiveMatterAction,
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
  const missingDetails = getMissingMatterDetails(matter, assignedAttorneyNames, assignedStaffNames);
  const headerBadges = getHeaderBadges(matter);
  const summaryFields = [
    { label: "Next action", value: matter.nextAction ?? "Not assigned" },
    { label: "Responsible person", value: matter.assignedFirmUser },
    { label: "Due date", value: matter.nextActionDueDate ? <DateDisplay value={matter.nextActionDueDate} /> : "Not set" },
    { label: "Amount sought", value: <CurrencyDisplay value={matter.amountSought} /> },
    { label: "Amount recovered", value: <CurrencyDisplay value={matter.amountRecovered} /> },
    { label: "Statute deadline", value: matter.statuteDeadline ? <DateDisplay value={matter.statuteDeadline} /> : "Not entered" },
    ...(assessment
      ? [
          { label: "Viability", value: `${assessment.viabilityScore}/100` },
          { label: "Expected net value", value: <CurrencyDisplay value={assessment.expectedNetValue} /> },
          { label: "Completeness", value: `${assessment.dataCompletenessPercentage}%` },
        ]
      : []),
  ];

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
        <OverviewContent
          assignedAttorneyNames={assignedAttorneyNames}
          assignedStaffNames={assignedStaffNames}
          matter={matter}
          missingDetails={missingDetails}
        >
          <Section title="Matter Parties">
              {matter.parties.length === 0 ? (
                <ActionEmptyState
                  actionHref={`/matters/${matter.id}/intake`}
                  actionLabel="Add Party"
                  description="Add the insured or responsible party to continue the recovery review."
                  title="No responsible party added"
                />
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
                {matter.internalNotes ? (
                  <p className="py-2 text-sm leading-6 text-muted-foreground">{matter.internalNotes}</p>
                ) : (
                  <ActionEmptyState
                    actionHref="#current-status"
                    actionLabel="Add Note"
                    description="Internal notes can capture handling context that should not appear in external updates."
                    title="No internal notes recorded"
                  />
                )}
              </Section>
            ) : null}
        </OverviewContent>
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
                <form action={submitUpsertTaskAction} className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-4" key={task.id}>
                  <input name="matterId" type="hidden" value={matter.id} />
                  <input name="taskId" type="hidden" value={task.id} />
                  <TextAreaField className="md:col-span-2" label="Title" name="title" value={task.title} />
                  <SelectField label="Priority" name="priority" options={Object.entries(priorityLabels)} value={task.priority} />
                  <DateField label="Due date" name="dueDate" value={task.dueDate ?? ""} />
                  <SelectField label="Status" name="status" options={Object.entries(taskStatusLabels)} value={task.status} />
                  <TextAreaField className="md:col-span-2 xl:col-span-3" label="Description" name="description" rows={3} value={task.description ?? ""} />
                  {matter.permissions.canManageTasks ? (
                    <Button className="self-end justify-self-start xl:justify-self-end" type="submit" variant="outline">
                      Save
                    </Button>
                  ) : null}
                </form>
              ))}
              {matter.tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks recorded yet.</p> : null}
              {matter.permissions.canManageTasks ? (
                <form action={submitUpsertTaskAction} className="grid min-w-0 gap-3 rounded-lg border border-dashed border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-4">
                  <input name="matterId" type="hidden" value={matter.id} />
                  <TextAreaField className="md:col-span-2" label="Title" name="title" value="" />
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
                <form action={submitUpsertDeadlineAction} className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-4" key={deadline.id}>
                  <input name="matterId" type="hidden" value={matter.id} />
                  <input name="deadlineId" type="hidden" value={deadline.id} />
                  <TextAreaField className="md:col-span-2" label="Title" name="title" value={deadline.title} />
                  <SelectField label="Type" name="deadlineType" options={Object.entries(deadlineTypeLabels)} value={deadline.deadlineType} />
                  <DateField label="Date" name="deadlineDate" value={deadline.deadlineDate} />
                  <DateField label="Reminder" name="reminderDate" value={deadline.reminderDate ?? ""} />
                  <TextAreaField className="md:col-span-2 xl:col-span-3" label="Notes" name="notes" rows={3} value={deadline.notes ?? ""} />
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
                <form action={submitUpsertDeadlineAction} className="grid min-w-0 gap-3 rounded-lg border border-dashed border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-4">
                  <input name="matterId" type="hidden" value={matter.id} />
                  <TextAreaField className="md:col-span-2" label="Title" name="title" value="" />
                  <SelectField label="Type" name="deadlineType" options={Object.entries(deadlineTypeLabels)} value="other" />
                  <DateField label="Date" name="deadlineDate" value="" />
                  <TextAreaField className="md:col-span-2 xl:col-span-3" label="Notes" name="notes" rows={3} value="" />
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
                {(item.documentLinks ?? []).length > 0 ? (
                  <div className="lg:col-span-6">
                    <p className="text-xs font-medium text-muted-foreground">Linked documents</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(item.documentLinks ?? []).map((document) => (
                        <a
                          className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
                          href={`/api/documents/${document.documentId}/download`}
                          key={document.documentId}
                          rel="noreferrer"
                          target="_blank"
                          title={document.displayFilename}
                        >
                          {document.title}
                        </a>
                      ))}
                    </div>
                  </div>
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
            {assessment ? (
              <AssessmentSummaryCards assessment={assessment} primaryUrgency={primaryTriageFlag} />
            ) : (
              <ActionCallout
                actionHref={`/matters/${matter.id}/assessment`}
                actionLabel="Start Assessment"
                description="Complete an assessment after the initial matter review."
                title="Recovery assessment not started"
              />
            )}
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
        items={headerBadges}
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
        fields={summaryFields}
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
            <MatterMoreActions matter={matter} />
            {matter.stage === "closed" && matter.permissions.canReopen ? (
              <ReopenMatterDialog defaultResponsibleUser={matter.assignedAttorneyId ?? matter.assignedStaffId ?? ""} matterId={matter.id} />
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

function OverviewContent({
  assignedAttorneyNames,
  assignedStaffNames,
  children,
  matter,
  missingDetails,
}: {
  assignedAttorneyNames: string;
  assignedStaffNames: string;
  children: ReactNode;
  matter: MatterDetail;
  missingDetails: string[];
}) {
  const populatedGroups = [
    {
      title: "Referral Information",
      items: [
        ["Carrier", matter.carrierName],
        ["Claim number", matter.carrierClaimNumber],
        ["Firm matter number", matter.firmMatterNumber],
        ["Date referred", matter.dateReferred],
        ["Date of loss", matter.dateOfLoss],
        ["Matter type", matterTypeLabels[matter.matterType]],
        ["Jurisdiction", matter.jurisdiction],
        ["Venue", matter.venue],
      ] as Array<[string, ReactNode | null | undefined]>,
    },
    {
      title: "Carrier Team",
      items: [
        ["Assigned adjuster", matter.assignedAdjusterName],
        ["Adjuster email", matter.adjusterEmail],
        ["Adjuster phone", matter.adjusterPhone],
        ["Department", matter.adjusterDepartment],
        ["Carrier supervisor", matter.carrierSupervisorName],
      ] as Array<[string, ReactNode | null | undefined]>,
    },
    {
      title: "Firm Team",
      items: [
        ["Assigned attorneys", assignedAttorneyNames === "Not assigned" ? null : assignedAttorneyNames],
        ["Assigned staff", assignedStaffNames === "Not assigned" ? null : assignedStaffNames],
      ] as Array<[string, ReactNode | null | undefined]>,
    },
    {
      title: "Liability and Insurance",
      items: [
        ["Insurance status", matter.insuranceStatus === "unknown" ? null : insuranceStatusLabels[matter.insuranceStatus]],
        ["Liability assessment", matter.liabilityAssessment === "unknown" ? null : assessmentLabels[matter.liabilityAssessment]],
        ["Collectability", matter.collectabilityAssessment === "unknown" ? null : assessmentLabels[matter.collectabilityAssessment]],
        ["Adverse insurer", matter.adverseInsurer],
        ["Adverse claim", matter.adverseClaimNumber],
        ["Liability summary", matter.liabilitySummary],
      ] as Array<[string, ReactNode | null | undefined]>,
    },
  ];

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="grid gap-6 p-6 xl:grid-cols-2">
        <MissingDetailsPanel count={missingDetails.length} examples={missingDetails.slice(0, 4)} matterId={matter.id} />
        {populatedGroups.map((group) => {
          const items = group.items.filter(([, value]) => isPresent(value));
          if (items.length === 0) return null;
          return (
            <Section key={group.title} title={group.title}>
              {items.map(([label, value]) => <Info key={label} label={label} value={value} />)}
            </Section>
          );
        })}
        {children}
        <details className="xl:col-span-2 rounded-lg border border-border bg-background p-4">
          <summary className="cursor-pointer text-sm font-semibold text-primary">Show all fields</summary>
          <div className="mt-4 grid gap-6 xl:grid-cols-2">
            {populatedGroups.map((group) => (
              <Section key={group.title} title={group.title}>
                {group.items.map(([label, value]) => <Info key={label} label={label} value={isPresent(value) ? value : "Not entered"} />)}
              </Section>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function MissingDetailsPanel({ count, examples, matterId }: { count: number; examples: string[]; matterId: string }) {
  if (count === 0) return null;
  const exampleText = `${examples.join(", ")}${count > examples.length ? `, and ${count - examples.length} more` : ""}`;
  return (
    <div className="xl:col-span-2 rounded-lg border border-[color:var(--warning)]/20 bg-[var(--warning-muted)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-[var(--warning)]">{count} details still needed</p>
          <p className="mt-1 text-sm text-[var(--warning)]">{exampleText}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/matters/${matterId}/intake`}>Complete missing information</Link>
        </Button>
      </div>
    </div>
  );
}

function ActionEmptyState({ actionHref, actionLabel, description, title }: { actionHref: string; actionLabel: string; description: string; title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-4">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      <Button asChild className="mt-3" size="sm" variant="outline">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

function ActionCallout({ actionHref, actionLabel, description, title }: { actionHref: string; actionLabel: string; description: string; title: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      <Button asChild className="mt-3" size="sm">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

function MatterMoreActions({ matter }: { matter: MatterDetail }) {
  const canShow = (matter.stage !== "closed" && matter.permissions.canClose) || matter.permissions.canArchive || (matter.isArchived && matter.permissions.canRestore);
  if (!canShow) return null;
  return (
    <details className="relative">
      <summary className="flex h-10 cursor-pointer list-none items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground">
        More Actions
      </summary>
      <div className="absolute right-0 z-20 mt-2 grid min-w-44 gap-2 rounded-lg border border-border bg-popover p-2 shadow-md">
        {matter.stage !== "closed" && matter.permissions.canClose ? <CloseMatterDialog matterId={matter.id} /> : null}
        {matter.isArchived && matter.permissions.canRestore ? (
          <form action={submitRestoreMatterAction}>
            <input name="matterId" type="hidden" value={matter.id} />
            <Button className="w-full justify-start" size="sm" type="submit" variant="ghost">Restore Matter</Button>
          </form>
        ) : matter.permissions.canArchive ? (
          <form action={submitArchiveMatterAction}>
            <input name="matterId" type="hidden" value={matter.id} />
            <Button className="w-full justify-start" size="sm" type="submit" variant="ghost">Archive Matter</Button>
          </form>
        ) : null}
      </div>
    </details>
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

function getMissingMatterDetails(matter: MatterDetail, assignedAttorneyNames: string, assignedStaffNames: string) {
  const details: string[] = [];
  if (!matter.assignedAdjusterName) details.push("Adjuster");
  if (!matter.dateOfLoss) details.push("Date of loss");
  if (!matter.jurisdiction) details.push("Jurisdiction");
  if (matter.parties.length === 0) details.push("Responsible party");
  if (matter.insuranceStatus === "unknown") details.push("Insurance status");
  if (matter.liabilityAssessment === "unknown") details.push("Liability assessment");
  if (!matter.carrierSupervisorName) details.push("Carrier supervisor");
  if (assignedAttorneyNames === "Not assigned") details.push("Lead attorney");
  if (assignedStaffNames === "Not assigned") details.push("Assigned staff");
  if (!matter.currentStatusSummary) details.push("Current status");
  return details;
}

function getHeaderBadges(matter: MatterDetail) {
  const badges: Array<{ key: string; node: ReactNode }> = [];
  if (matter.warnings.includes("deadline_within_30")) badges.push({ key: "critical-deadline", node: <StatusBadge status="Critical deadline" /> });
  if (matter.warnings.includes("overdue_next_action")) badges.push({ key: "overdue", node: <StatusBadge status="Action overdue" /> });
  if (matter.warnings.includes("missing_information") || matter.warnings.includes("missing_required_evidence")) badges.push({ key: "missing", node: <StatusBadge status="Missing information" /> });
  if (matter.warnings.includes("unverified_statute_deadline")) badges.push({ key: "unverified", node: <StatusBadge status="Deadline unverified" /> });
  if (badges.length === 0) badges.push({ key: "stage", node: <StatusBadge status={matterStageLabels[matter.stage] as MatterStatus} /> });
  if (matter.intakeStatus !== "complete") badges.push({ key: "intake", node: <StatusBadge status={intakeStatusLabels[matter.intakeStatus] as MatterStatus} /> });
  return badges;
}

function isPresent(value: ReactNode | null | undefined) {
  return value !== null && value !== undefined && value !== "" && value !== "Not assigned" && value !== "Not entered" && value !== "Unknown" && value !== "Not started";
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
