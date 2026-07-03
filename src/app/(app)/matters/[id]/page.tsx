import Link from "next/link";
import type { ReactNode } from "react";
import { Pencil, PlusCircle } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { StatusBadge } from "@/components/common/status-badge";
import { MatterWarnings } from "@/components/matters/matter-workspace-card";
import { DetailSummaryCard } from "@/components/matters/detail-summary-card";
import { AssessmentSummaryCards } from "@/components/recovery-assessment/assessment-summary-cards";
import { MatterTriagePanel } from "@/components/triage/matter-triage-panel";
import { TriageSeverityBadge } from "@/components/triage/triage-severity-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireActiveProfile } from "@/lib/auth/session";
import {
  assessmentLabels,
  deadlineTypeLabels,
  evidenceStatusLabels,
  insuranceStatusLabels,
  intakeStatusLabels,
  labelFromValue,
  matterStageLabels,
  matterTypeLabels,
  priorityLabels,
  taskStatusLabels,
  warningLabels,
} from "@/lib/matters-workspace/labels";
import { loadMatterDetail } from "@/lib/matters-workspace/data";
import { loadActiveMatterFlags, loadRecentResolvedMatterFlags, loadTriageSettings } from "@/lib/triage/data";
import { evaluateMatterTriage, getPrimaryTriageFlag, isSnoozed } from "@/lib/triage/rules";
import { createSnapshotFromDetail } from "@/lib/triage/types";
import { loadMatterAssessmentBundle } from "@/lib/recovery-assessment/data";
import {
  submitAddMatterEventAction,
  submitArchiveMatterAction,
  submitCloseMatterAction,
  submitReopenMatterAction,
  submitRestoreMatterAction,
  submitUpdateCurrentStatusAction,
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
  const primaryTriageFlag = getPrimaryTriageFlag(activeTriageFlags);
  const primaryWarning = matter.warnings[0];
  const remaining = Math.max(0, matter.amountSought - matter.amountRecovered);
  const recoveryPercent = matter.amountSought > 0 ? Math.round((matter.amountRecovered / matter.amountSought) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button asChild className="h-10 gap-2" variant="outline">
              <a href="#current-status">
                <Pencil aria-hidden="true" className="size-4" />
                Edit Matter
              </a>
            </Button>
            <Button asChild className="h-10 gap-2" variant="outline">
              <a href="#tasks">
                <PlusCircle aria-hidden="true" className="size-4" />
                Add Task
              </a>
            </Button>
            <Button asChild className="h-10 gap-2" variant="outline">
              <a href="#deadlines">Add Deadline</a>
            </Button>
            <Button asChild className="h-10 gap-2" variant="outline">
              <a href="#activity">Add Event</a>
            </Button>
          </>
        }
        subtitle={`${matter.carrierName} · Claim ${matter.carrierClaimNumber ?? "No claim number"}${matter.firmMatterNumber ? ` · ${matter.firmMatterNumber}` : ""}`}
        title={matter.matterName}
      />

      <div className="flex flex-wrap gap-2">
        <StatusBadge status={matterTypeLabels[matter.matterType] as MatterStatus} />
        <StatusBadge status={intakeStatusLabels[matter.intakeStatus] as MatterStatus} />
        <StatusBadge status={matterStageLabels[matter.stage] as MatterStatus} />
        <StatusBadge status={priorityLabels[matter.priority] as MatterStatus} />
        {matter.statuteDeadlineVerified ? <StatusBadge status="Deadline verified" /> : <StatusBadge status="Unverified statute deadline" />}
        {primaryTriageFlag ? <TriageSeverityBadge severity={primaryTriageFlag.severity} /> : null}
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">
              {activeTriageFlags.length === 0
                ? "No current triage issues"
                : activeTriageFlags.some((flag) => flag.flagType === "ready_for_demand")
                  ? "Appears ready for demand review"
                  : `${activeTriageFlags.length} ${activeTriageFlags.length === 1 ? "issue requires" : "issues require"} attention`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {primaryTriageFlag ? primaryTriageFlag.explanation : "The current rule set did not identify a matter-level flag."}
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="#attention">Review Attention</a>
          </Button>
        </CardContent>
      </Card>

      {primaryWarning ? (
        <Card className="border-[color:var(--warning)]/20 bg-[var(--warning-muted)] shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-[var(--warning)]">{warningLabels[primaryWarning]}</p>
              <p className="mt-1 text-sm text-[var(--warning)]">Review the remaining warnings and update the matter if the condition has changed.</p>
            </div>
            <MatterWarnings warnings={matter.warnings} />
          </CardContent>
        </Card>
      ) : null}

      {matter.intakeStatus !== "complete" ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">This intake is incomplete. Step {matter.currentIntakeStep} of 3 was last autosaved {matter.lastAutosavedAt ? matter.lastAutosavedAt.slice(0, 10) : "recently"}.</p>
            <Button asChild>
              <Link href={`/matters/${matter.id}/intake`}>Resume Intake</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <MatterTriagePanel
        activeFlags={activeTriageFlags}
        matterId={matter.id}
        profile={session.profile}
        resolvedFlags={resolvedTriageFlags}
      />

      <Card className="border-border bg-card shadow-sm" id="recovery-assessment">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeader
              description="Structured assessment of recovery strength, expected value, information completeness, and urgency. This does not change the matter stage."
              title="Recovery Assessment"
            />
            <Button asChild>
              <Link href={`/matters/${matter.id}/assessment`}>
                {assessmentBundle.current || assessmentBundle.draft ? "Open Assessment" : "Start Assessment"}
              </Link>
            </Button>
          </div>
          <AssessmentSummaryCards assessment={assessmentBundle.current ?? assessmentBundle.draft} primaryUrgency={primaryTriageFlag} />
          {assessmentBundle.current?.overrideReason ? (
            <div className="rounded-lg border border-[color:var(--warning)]/20 bg-[var(--warning-muted)] p-3 text-sm text-[var(--warning)]">
              Attorney override recorded: {assessmentBundle.current.overrideReason}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Matter summary">
        <DetailSummaryCard label="Amount sought" value={<CurrencyDisplay value={matter.amountSought} />} />
        <DetailSummaryCard label="Amount recovered" value={<CurrencyDisplay value={matter.amountRecovered} />} description={`${recoveryPercent}% recovered`} />
        <DetailSummaryCard label="Statute deadline" value={matter.statuteDeadline ? <DateDisplay value={matter.statuteDeadline} /> : "Not entered"} description={matter.statuteDeadlineVerified ? "Deadline verified" : "Requires verification"} />
        <DetailSummaryCard label="Next action" value={<span className="text-lg">{matter.nextAction ?? "Not assigned"}</span>} description={matter.nextActionDueDate ? `Due ${matter.nextActionDueDate}` : "No due date"} />
        <DetailSummaryCard label="Current stage" value={<span className="text-lg">{matterStageLabels[matter.stage]}</span>} description={matter.daysSinceLastSubstantiveActivity === null ? "No activity yet" : `${matter.daysSinceLastSubstantiveActivity} days since activity`} />
      </section>

      <Card className="border-border bg-card shadow-sm" id="current-status">
        <CardContent className="grid gap-6 p-6 xl:grid-cols-[1fr_420px]">
          <div>
            <SectionHeader title="Current Status" />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {matter.currentStatusSummary ?? "No status summary has been recorded yet."}
            </p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Info label="Stage" value={matterStageLabels[matter.stage]} />
              <Info label="Next action" value={matter.nextAction ?? "Not assigned"} />
              <Info label="Responsible person" value={matter.assignedFirmUser} />
              <Info label="Due date" value={matter.nextActionDueDate ?? "Not set"} />
              <Info label="Last substantive activity" value={matter.lastSubstantiveActivityAt?.slice(0, 10) ?? "Not recorded"} />
              <Info label="Last updated by" value={matter.statusSummaryUpdatedByName ?? "Not recorded"} />
            </dl>
          </div>
          {matter.permissions.canEditMatter ? (
            <form action={submitUpdateCurrentStatusAction} className="grid gap-3 rounded-lg border border-border bg-background p-4">
              <input name="matterId" type="hidden" value={matter.id} />
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>Status summary</span>
                <textarea className="min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" defaultValue={matter.currentStatusSummary ?? ""} name="currentStatusSummary" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField label="Stage" name="stage" value={matter.stage} options={Object.entries(matterStageLabels)} />
                <SelectField label="Priority" name="priority" value={matter.priority} options={Object.entries(priorityLabels)} />
                <TextField label="Next action" name="nextAction" value={matter.nextAction ?? ""} />
                <DateField label="Next-action due" name="nextActionDueDate" value={matter.nextActionDueDate ?? ""} />
              </div>
              <Button type="submit">Update Current Status</Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Tabs className="space-y-4" defaultValue="overview">
        <TabsList className="h-auto w-full flex-wrap justify-start rounded-lg border border-border bg-card p-1 [&_[data-slot=tabs-trigger]]:min-h-9 [&_[data-slot=tabs-trigger]]:flex-none [&_[data-slot=tabs-trigger]]:px-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
                <Info label="Assigned attorney" value={matter.assignedAttorneyName ?? "Not assigned"} />
                <Info label="Assigned staff" value={matter.assignedStaffName ?? "Not assigned"} />
                {matter.assignments.map((assignment) => (
                  <Info key={assignment.id} label={assignment.role} value={assignment.profileName} />
                ))}
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
                {matter.parties.length === 0 ? <p className="text-sm text-muted-foreground">No parties associated yet.</p> : matter.parties.map((party) => (
                <form action={submitUpsertPartyAction} className="rounded-lg border border-border bg-background p-3" key={party.id}>
                    <input name="matterId" type="hidden" value={matter.id} />
                    <input name="partyId" type="hidden" value={party.id} />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{party.name}</p>
                        <p className="text-sm text-muted-foreground">{party.role}{party.isPrimary ? " · Primary" : ""}</p>
                      </div>
                      {matter.permissions.canManageParties ? <Button size="sm" type="submit" variant="outline">Save</Button> : null}
                    </div>
                    {matter.permissions.canManageParties ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <TextField label="Role" name="role" value={party.role.replaceAll(" ", "_")} />
                        <TextField label="Notes" name="notes" value={party.notes ?? ""} />
                        <label className="flex items-center gap-2 text-sm"><input defaultChecked={party.isPrimary} name="isPrimary" type="checkbox" /> Primary</label>
                      </div>
                    ) : null}
                  </form>
                ))}
              </Section>
              {matter.canViewInternalNotes ? (
                <Section title="Internal Notes">
                  <p className="text-sm leading-6 text-muted-foreground">{matter.internalNotes ?? "No internal notes recorded."}</p>
                </Section>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials">
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
        </TabsContent>

        <TabsContent value="evidence" id="evidence">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-6">
              <SectionHeader description="Track evidence status. Document upload will be added in a later phase." title="Evidence" />
              {matter.evidence.map((item) => (
                <form action={submitUpsertEvidenceAction} className="grid gap-3 rounded-lg border border-border bg-background p-4 lg:grid-cols-[1fr_180px_140px_140px_1fr_auto]" key={item.id}>
                  <input name="matterId" type="hidden" value={matter.id} />
                  <input name="evidenceId" type="hidden" value={item.id} />
                  <TextField label="Evidence type" name="evidenceType" value={item.evidenceType} />
                  <SelectField label="Status" name="status" value={item.status} options={Object.entries(evidenceStatusLabels)} />
                  <DateField label="Requested" name="dateRequested" value={item.dateRequested ?? ""} />
                  <DateField label="Received" name="dateReceived" value={item.dateReceived ?? ""} />
                  <TextField label="Notes" name="notes" value={item.notes ?? ""} />
                  {matter.permissions.canManageEvidence ? <Button className="self-end" type="submit" variant="outline">Save</Button> : null}
                </form>
              ))}
              {matter.permissions.canManageEvidence ? (
                <form action={submitUpsertEvidenceAction} className="grid gap-3 rounded-lg border border-dashed border-border bg-background p-4 lg:grid-cols-[1fr_180px_1fr_auto]">
                  <input name="matterId" type="hidden" value={matter.id} />
                  <TextField label="New evidence type" name="evidenceType" value="other" />
                  <SelectField label="Status" name="status" value="requested" options={Object.entries(evidenceStatusLabels)} />
                  <TextField label="Notes" name="notes" value="" />
                  <Button className="self-end" type="submit">Add Evidence</Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines" id="deadlines">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-6">
              <SectionHeader title="Deadlines" />
              {matter.deadlines.map((deadline) => (
                <form action={submitUpsertDeadlineAction} className="grid gap-3 rounded-lg border border-border bg-background p-4 lg:grid-cols-[1fr_180px_150px_150px_1fr_auto]" key={deadline.id}>
                  <input name="matterId" type="hidden" value={matter.id} />
                  <input name="deadlineId" type="hidden" value={deadline.id} />
                  <TextField label="Title" name="title" value={deadline.title} />
                  <SelectField label="Type" name="deadlineType" value={deadline.deadlineType} options={Object.entries(deadlineTypeLabels)} />
                  <DateField label="Date" name="deadlineDate" value={deadline.deadlineDate} />
                  <DateField label="Reminder" name="reminderDate" value={deadline.reminderDate ?? ""} />
                  <TextField label="Notes" name="notes" value={deadline.notes ?? ""} />
                  <div className="self-end space-y-2">
                    {matter.permissions.canVerifyDeadlines ? <label className="flex items-center gap-2 text-xs"><input defaultChecked={deadline.isVerified} name="verify" type="checkbox" /> Verified</label> : null}
                    {matter.permissions.canManageDeadlines ? <Button type="submit" variant="outline">Save</Button> : null}
                  </div>
                </form>
              ))}
              {matter.permissions.canManageDeadlines ? (
                <form action={submitUpsertDeadlineAction} className="grid gap-3 rounded-lg border border-dashed border-border bg-background p-4 lg:grid-cols-[1fr_180px_150px_1fr_auto]">
                  <input name="matterId" type="hidden" value={matter.id} />
                  <TextField label="Title" name="title" value="" />
                  <SelectField label="Type" name="deadlineType" value="other" options={Object.entries(deadlineTypeLabels)} />
                  <DateField label="Date" name="deadlineDate" value="" />
                  <TextField label="Notes" name="notes" value="" />
                  <Button className="self-end" type="submit">Add Deadline</Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" id="tasks">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-6">
              <SectionHeader title="Tasks" />
              {matter.tasks.map((task) => (
                <form action={submitUpsertTaskAction} className="grid gap-3 rounded-lg border border-border bg-background p-4 lg:grid-cols-[1fr_180px_150px_160px_1fr_auto]" key={task.id}>
                  <input name="matterId" type="hidden" value={matter.id} />
                  <input name="taskId" type="hidden" value={task.id} />
                  <TextField label="Title" name="title" value={task.title} />
                  <SelectField label="Priority" name="priority" value={task.priority} options={Object.entries(priorityLabels)} />
                  <DateField label="Due date" name="dueDate" value={task.dueDate ?? ""} />
                  <SelectField label="Status" name="status" value={task.status} options={Object.entries(taskStatusLabels)} />
                  <TextField label="Description" name="description" value={task.description ?? ""} />
                  {matter.permissions.canManageTasks ? <Button className="self-end" type="submit" variant="outline">Save</Button> : null}
                </form>
              ))}
              {matter.permissions.canManageTasks ? (
                <form action={submitUpsertTaskAction} className="grid gap-3 rounded-lg border border-dashed border-border bg-background p-4 lg:grid-cols-[1fr_180px_150px_160px_auto]">
                  <input name="matterId" type="hidden" value={matter.id} />
                  <TextField label="Title" name="title" value="" />
                  <SelectField label="Priority" name="priority" value="normal" options={Object.entries(priorityLabels)} />
                  <DateField label="Due date" name="dueDate" value="" />
                  <SelectField label="Status" name="status" value="not_started" options={Object.entries(taskStatusLabels)} />
                  <Button className="self-end" type="submit">Add Task</Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" id="activity">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="space-y-6 p-6">
              <SectionHeader title="Activity" />
              {matter.permissions.canAddEvents ? (
                <form action={submitAddMatterEventAction} className="grid gap-3 rounded-lg border border-border bg-background p-4 lg:grid-cols-[180px_220px_1fr_auto]">
                  <input name="matterId" type="hidden" value={matter.id} />
                  <SelectField label="Event type" name="eventType" value="other" options={[["document_requested", "Document requested"], ["document_received", "Document received"], ["demand_sent", "Demand sent"], ["response_received", "Response received"], ["offer_received", "Offer received"], ["recovery_received", "Recovery received"], ["other", "Other event"]]} />
                  <label className="space-y-1 text-sm font-medium text-foreground">
                    <span>Date and time</span>
                    <Input name="occurredAt" type="datetime-local" />
                  </label>
                  <TextField label="Description" name="description" value="" />
                  <Button className="self-end" type="submit">Add Event</Button>
                </form>
              ) : null}
              <div className="space-y-3">
                {matter.timeline.map((item) => (
                  <div className="rounded-lg border border-border bg-background p-4" key={`${item.kind}-${item.id}`}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.kind === "event" ? "Ready for demand" : "Under review"} />
                        <p className="font-medium text-foreground">{labelFromValue(item.label)}</p>
                      </div>
                      <time className="text-sm text-muted-foreground" dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString()}</time>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                    {item.actorName ? <p className="mt-2 text-xs text-muted-foreground">By {item.actorName}</p> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                <Button type="submit" variant="outline">Close Matter</Button>
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
                <Button type="submit" variant="outline">Reopen Matter</Button>
              </form>
            ) : null}
            {matter.isArchived && matter.permissions.canRestore ? (
              <form action={submitRestoreMatterAction}>
                <input name="matterId" type="hidden" value={matter.id} />
                <Button type="submit" variant="outline">Restore Matter</Button>
              </form>
            ) : matter.permissions.canArchive ? (
              <form action={submitArchiveMatterAction}>
                <input name="matterId" type="hidden" value={matter.id} />
                <Button type="submit" variant="outline">Archive Matter</Button>
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
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function TextField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Input defaultValue={value} name={name} />
    </label>
  );
}

function DateField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Input defaultValue={value} name={name} type="date" />
    </label>
  );
}

function MoneyField({ label, name, value }: { label: string; name: string; value: number }) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Input defaultValue={value.toFixed(2)} inputMode="decimal" name={name} />
    </label>
  );
}

function SelectField({ label, name, value, options }: { label: string; name: string; value: string; options: Array<[string, string]> }) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm" defaultValue={value} name={name}>
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
