import Link from "next/link";
import type { ReactNode } from "react";
import { PlusCircle, RotateCw } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DataTableShell } from "@/components/common/data-table-shell";
import { DateDisplay } from "@/components/common/date-display";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SummaryMetricCard } from "@/components/common/summary-metric-card";
import { TriageSeverityBadge } from "@/components/triage/triage-severity-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableCell, TableRow } from "@/components/ui/table";
import { requireActiveProfile } from "@/lib/auth/session";
import { loadDashboardData, type DashboardMatter } from "@/lib/dashboard/data";
import { taskStatusLabels } from "@/lib/matters-workspace/labels";
import { submitRefreshDashboardTriageAction } from "@/lib/triage/actions";
import type { MatterStatus } from "@/lib/types";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const queueColumns = [
  { key: "matter", header: "Matter" },
  { key: "carrier", header: "Carrier" },
  { key: "adjuster", header: "Adjuster" },
  { key: "amount", header: "Amount sought" },
  { key: "issue", header: "Primary issue" },
  { key: "action", header: "Next action" },
  { key: "responsible", header: "Responsible user" },
  { key: "due", header: "Due date" },
  { key: "statute", header: "Statute deadline" },
  { key: "activity", header: "Activity age" },
  { key: "severity", header: "Severity" },
];

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireActiveProfile();
  const mode = readParam(params.mode);
  const dashboard = await loadDashboardData({ profile: session.profile, mode });

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <div className="flex rounded-lg border border-border bg-card p-1" aria-label="Dashboard mode">
              <Button asChild size="sm" variant={dashboard.mode === "my" ? "secondary" : "ghost"}>
                <Link href="/dashboard?mode=my">My Work</Link>
              </Button>
              {dashboard.canUseFirmMode ? (
                <Button asChild size="sm" variant={dashboard.mode === "firm" ? "secondary" : "ghost"}>
                  <Link href="/dashboard?mode=firm">Firm Overview</Link>
                </Button>
              ) : null}
            </div>
            <form action={submitRefreshDashboardTriageAction}>
              <input name="mode" type="hidden" value={dashboard.mode} />
              <Button className="h-10 gap-2" type="submit" variant="outline">
                <RotateCw aria-hidden="true" className="size-4" />
                Refresh Triage
              </Button>
            </form>
            <Button asChild className="h-10 gap-2">
              <Link href="/matters/new">
                <PlusCircle aria-hidden="true" className="size-4" />
                Add Matter
              </Link>
            </Button>
          </>
        }
        subtitle="Here is what needs attention today."
        title={`Good morning, ${dashboard.greetingName}`}
      />

      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span className="font-medium text-foreground">{dashboard.mode === "firm" ? "Firm Overview" : "My Work"}</span>
        {" "}is showing {dashboard.totalMatterCount} permitted matter{dashboard.totalMatterCount === 1 ? "" : "s"}.
        {" "}Rules are transparent operational flags, not a Recovery Score or legal advice.
        {dashboard.lastFlagRefreshAt ? ` Last persisted refresh: ${new Date(dashboard.lastFlagRefreshAt).toLocaleString()}.` : " Persisted flags will appear after triage refresh."}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Matter summary">
        {dashboard.summaryMetrics.map((metric) => (
          <SummaryMetricCard key={metric.title} metric={metric} />
        ))}
      </section>

      <section className="space-y-4">
        <SectionHeader
          description="Ranked deterministically by legal deadlines, overdue actions, missing information, stale activity, and readiness flags."
          title="Priority Work Queue"
        />
        {dashboard.priorityQueue.length > 0 ? (
          <>
            <div className="hidden 2xl:block">
              <DataTableShell columns={queueColumns}>
                {dashboard.priorityQueue.map((matter) => (
                  <TableRow className="h-16" key={matter.snapshot.id}>
                    <TableCell>
                      <MatterLink matter={matter} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{matter.snapshot.carrierName}</TableCell>
                    <TableCell className="text-muted-foreground">{matter.snapshot.assignedAdjusterName ?? "Not assigned"}</TableCell>
                    <TableCell className="font-medium"><CurrencyDisplay value={matter.snapshot.amountSought} /></TableCell>
                    <TableCell className="max-w-64">
                      <p className="font-medium text-foreground">{matter.primaryFlag?.title ?? "No current issue"}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{matter.primaryFlag?.explanation}</p>
                    </TableCell>
                    <TableCell className="max-w-52 text-muted-foreground">{matter.snapshot.nextAction ?? "Not assigned"}</TableCell>
                    <TableCell className="text-muted-foreground">{matter.snapshot.assignedFirmUser}</TableCell>
                    <TableCell>{matter.snapshot.nextActionDueDate ? <DateDisplay value={matter.snapshot.nextActionDueDate} /> : "Not set"}</TableCell>
                    <TableCell>{matter.snapshot.statuteDeadline ? <DateDisplay value={matter.snapshot.statuteDeadline} /> : "Not entered"}</TableCell>
                    <TableCell className="text-muted-foreground">{matter.snapshot.daysSinceLastSubstantiveActivity === null ? "No activity" : `${matter.snapshot.daysSinceLastSubstantiveActivity} days`}</TableCell>
                    <TableCell>{matter.primaryFlag ? <TriageSeverityBadge severity={matter.primaryFlag.severity} /> : null}</TableCell>
                  </TableRow>
                ))}
              </DataTableShell>
            </div>
            <div className="grid gap-3 2xl:hidden">
              {dashboard.priorityQueue.map((matter) => <DashboardMatterCard key={matter.snapshot.id} matter={matter} />)}
            </div>
          </>
        ) : (
          <EmptyState
            description="There are no overdue actions, urgent deadlines, or high-priority triage flags in this view."
            title="Nothing urgent requires attention"
          />
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection title="My Tasks" description="Overdue tasks and tasks due within seven days.">
          {dashboard.myTasks.length > 0 ? dashboard.myTasks.map((task) => (
            <CompactRow
              href={`/matters/${task.matterId}#tasks`}
              key={task.id}
              meta={`${task.carrierName} · ${task.dueDate ? `Due ${task.dueDate}` : "No due date"}`}
              right={<StatusBadge status={taskStatusLabels[task.status] as MatterStatus} />}
              title={`${task.title} · ${task.matterName}`}
            />
          )) : <InlineEmpty title="You are caught up" description="You have no overdue tasks or tasks due soon." />}
        </DashboardSection>

        <DashboardSection title="Upcoming Deadlines" description="Overdue, urgent, upcoming, and unverified recorded deadlines.">
          {dashboard.upcomingDeadlines.length > 0 ? dashboard.upcomingDeadlines.map((deadline) => (
            <CompactRow
              href={`/matters/${deadline.matterId}#deadlines`}
              key={deadline.id}
              meta={`${deadline.deadlineType.replaceAll("_", " ")} · ${deadline.daysRemaining < 0 ? `${Math.abs(deadline.daysRemaining)} days overdue` : `${deadline.daysRemaining} days remaining`} · ${deadline.isVerified ? "Verified" : "Unverified"}`}
              right={<DateDisplay value={deadline.deadlineDate} />}
              title={`${deadline.title} · ${deadline.matterName}`}
            />
          )) : <InlineEmpty title="No deadlines are approaching" description="No recorded deadlines fall within the selected period." />}
          <Button asChild className="mt-2" variant="link">
            <Link href="/matters?view=upcoming-deadlines">View all deadlines</Link>
          </Button>
        </DashboardSection>

        <DashboardSection title="Ready for Demand" description="Transparent suggestions that still require attorney confirmation.">
          {dashboard.readyForDemand.length > 0 ? dashboard.readyForDemand.map((matter) => (
            <CompactRow
              href={`/matters/${matter.snapshot.id}#attention`}
              key={matter.snapshot.id}
              meta={`${matter.snapshot.carrierName} · ${matter.snapshot.liabilityAssessment} liability · ${matter.snapshot.insuranceStatus.replaceAll("_", " ")}`}
              right={<CurrencyDisplay value={matter.snapshot.amountSought} />}
              title={`${matter.snapshot.matterName} · Appears ready for attorney confirmation`}
            />
          )) : <InlineEmpty title="No matters currently meet the demand-readiness rules" description="Matters will appear after their required information and supporting evidence are recorded." />}
        </DashboardSection>

        <DashboardSection title="Needs Follow-Up" description="Waiting, stale, missing-next-action, or overdue-review matters.">
          {dashboard.needsFollowUp.length > 0 ? dashboard.needsFollowUp.map((matter) => (
            <CompactRow
              href={`/matters/${matter.snapshot.id}#attention`}
              key={matter.snapshot.id}
              meta={`${matter.primaryFlag?.suggestedAction ?? "Review the next step"} · ${matter.snapshot.assignedFirmUser}`}
              right={matter.primaryFlag ? <TriageSeverityBadge severity={matter.primaryFlag.severity} /> : null}
              title={`${matter.snapshot.matterName} · ${matter.primaryFlag?.title ?? "Follow-up needed"}`}
            />
          )) : <InlineEmpty title="Nothing urgent requires attention" description="There are no overdue actions or urgent follow-ups in your current view." />}
        </DashboardSection>

        <DashboardSection title="Missing Information" description="Material gaps that could block recovery work.">
          {dashboard.missingInformation.length > 0 ? dashboard.missingInformation.map((matter) => (
            <CompactRow
              href={`/matters/${matter.snapshot.id}#attention`}
              key={matter.snapshot.id}
              meta={matter.primaryFlag?.explanation ?? "Review missing information."}
              right={matter.primaryFlag ? <TriageSeverityBadge severity={matter.primaryFlag.severity} /> : null}
              title={`${matter.snapshot.matterName} · ${matter.primaryFlag?.title ?? "Information gap"}`}
            />
          )) : <InlineEmpty title="No material information gaps" description="The matters in this view have the core information being tracked." />}
        </DashboardSection>

        <DashboardSection title="Recent Activity" description="Meaningful matter events, excluding autosaves and UI activity.">
          {dashboard.recentActivity.length > 0 ? dashboard.recentActivity.map((activity) => (
            <CompactRow
              href={`/matters/${activity.matterId}#activity`}
              key={`${activity.id}-${activity.matterId}`}
              meta={`${activity.actorName ?? "Recovery Hub"} · ${new Date(activity.occurredAt).toLocaleString()}`}
              title={`${activity.label} · ${activity.matterName}`}
            />
          )) : <InlineEmpty title="No recent substantive activity" description="New matter events will appear here after they are recorded." />}
        </DashboardSection>

        <DashboardSection title="High-Value Opportunities" description="Assessment-based opportunities with positive expected net value and adequate completeness.">
          {dashboard.highValueOpportunities.length > 0 ? dashboard.highValueOpportunities.map((summary) => (
            <CompactRow
              href={`/matters/${summary.matterId}/assessment`}
              key={summary.matterId}
              meta={`${summary.current?.viabilityScore ?? 0}/100 viability · ${summary.current?.dataCompletenessPercentage ?? 0}% complete · ${summary.assignedAttorneyName ?? "Unassigned"}`}
              right={<CurrencyDisplay value={summary.current?.expectedNetValue ?? 0} />}
              title={`${summary.matterName} · Assessment-based opportunity`}
            />
          )) : <InlineEmpty title="No matters currently meet the assessment criteria" description="Opportunities will appear after sufficiently complete assessments are finalized." />}
        </DashboardSection>

        <DashboardSection title="Assessment Needed" description="Active reviewed matters above the assessment threshold with no finalized assessment.">
          {dashboard.assessmentNeeded.length > 0 ? dashboard.assessmentNeeded.map((matter) => (
            <CompactRow
              href={`/matters/${matter.snapshot.id}/assessment`}
              key={matter.snapshot.id}
              meta={`${matter.snapshot.carrierName} · ${matter.snapshot.assignedFirmUser} · amount sought ${matter.snapshot.amountSought.toLocaleString()}`}
              right={<span className="font-medium text-primary">Start</span>}
              title={`${matter.snapshot.matterName} · No finalized assessment`}
            />
          )) : <InlineEmpty title="No recovery assessments are currently needed" description="Matters that meet the threshold will appear here after initial review." />}
        </DashboardSection>
      </div>

      {dashboard.workload.length > 0 ? (
        <section className="space-y-4">
          <SectionHeader
            description="Firm-wide workload balancing for permitted users. This is not a productivity ranking."
            title="Workload Overview"
          />
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {dashboard.workload.map((item) => (
              <Card className="border-border bg-card shadow-sm" key={item.userName}>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground">{item.userName}</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Metric label="Active matters" value={item.activeMatters} />
                    <Metric label="Overdue actions" value={item.overdueNextActions} />
                    <Metric label="Upcoming deadlines" value={item.upcomingDeadlines} />
                    <Metric label="Open tasks" value={item.openTasks} />
                    <Metric label="Ready for demand" value={item.readyForDemand} />
                    <Metric label="Stale matters" value={item.staleMatters} />
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DashboardMatterCard({ matter }: { matter: DashboardMatter }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <Link className="block focus-visible:rounded-md" href={`/matters/${matter.snapshot.id}#attention`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">{matter.snapshot.matterName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{matter.snapshot.carrierName}</p>
            </div>
            {matter.primaryFlag ? <TriageSeverityBadge severity={matter.primaryFlag.severity} /> : null}
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">{matter.primaryFlag?.title ?? "No current issue"}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{matter.primaryFlag?.explanation}</p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Adjuster" value={matter.snapshot.assignedAdjusterName ?? "Not assigned"} />
            <Info label="Amount" value={<CurrencyDisplay value={matter.snapshot.amountSought} />} />
            <Info label="Next action" value={matter.snapshot.nextAction ?? "Not assigned"} />
            <Info label="Next-action due" value={matter.snapshot.nextActionDueDate ?? "Not set"} />
            <Info label="Statute deadline" value={matter.snapshot.statuteDeadline ?? "Not entered"} />
            <Info label="Activity age" value={matter.snapshot.daysSinceLastSubstantiveActivity === null ? "No activity" : `${matter.snapshot.daysSinceLastSubstantiveActivity} days`} />
            <Info label="Firm user" value={matter.snapshot.assignedFirmUser} />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function MatterLink({ matter }: { matter: DashboardMatter }) {
  return (
    <>
      <Link className="font-medium text-foreground hover:underline" href={`/matters/${matter.snapshot.id}`}>
        {matter.snapshot.matterName}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">{matter.flags.length} active {matter.flags.length === 1 ? "flag" : "flags"}</p>
    </>
  );
}

function DashboardSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionHeader description={description} title={title} />
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-3 p-4">{children}</CardContent>
      </Card>
    </section>
  );
}

function CompactRow({ title, meta, href, right }: { title: string; meta: string; href: string; right?: ReactNode }) {
  return (
    <Link className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between" href={href}>
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">{meta}</span>
      </span>
      {right ? <span className="shrink-0 text-sm text-muted-foreground">{right}</span> : null}
    </Link>
  );
}

function InlineEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-5">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
