import Link from "next/link";
import type { ReactNode } from "react";
import { PlusCircle, RotateCw } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { TriageSeverityBadge } from "@/components/triage/triage-severity-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireActiveProfile } from "@/lib/auth/session";
import { loadDashboardData, type DashboardMatter } from "@/lib/dashboard/data";
import { dashboardMatterLinks } from "@/lib/matters-workspace/links";
import { taskStatusLabels } from "@/lib/matters-workspace/labels";
import { submitRefreshDashboardTriageAction } from "@/lib/triage/actions";
import { cn } from "@/lib/utils";
import type { MatterStatus } from "@/lib/types";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const session = await requireActiveProfile();
  const mode = readParam(params.mode);
  const dashboard = await loadDashboardData({ profile: session.profile, mode });

  const urgentMatters = dedupeMatters([...dashboard.priorityQueue, ...dashboard.missingInformation]);
  const greeting = greetingFromDate(dashboard.today);
  const dateLabel = new Date(dashboard.today).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const activeMatterIds = new Set(urgentMatters.map((matter) => matter.snapshot.id));
  const followUpMatters = dashboard.needsFollowUp.filter((matter) => !activeMatterIds.has(matter.snapshot.id));

  return (
    <div className="space-y-6">
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
                Refresh
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
        subtitle={`${dateLabel} · ${dashboard.lastFlagRefreshAt ? `Last checked ${new Date(dashboard.lastFlagRefreshAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "Refresh to check for newly overdue work"}`}
        title={`${greeting}, ${dashboard.greetingName}`}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Today at a glance">
        <TodayMetric count={urgentMatters.length} href={dashboardMatterLinks.urgent} label="Urgent matters" tone="urgent" />
        <TodayMetric count={dashboard.myTasks.length} href={dashboardMatterLinks.tasks} label="Tasks due" tone="neutral" />
        <TodayMetric count={dashboard.upcomingDeadlines.length} href={dashboardMatterLinks.deadlines} label="Deadlines approaching" tone="warning" />
        <TodayMetric count={dashboard.readyForDemand.length} href={dashboardMatterLinks.readyForDemand} label="Ready for demand" tone="success" />
      </section>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-5">
          <Tabs defaultValue="urgent">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Action Center</h2>
              <p className="mt-1 text-sm text-muted-foreground">Everything that needs a decision today, in one place.</p>
            </div>
            <TabsList className="mt-4 min-h-11 w-full flex-wrap items-stretch justify-start gap-1 bg-secondary p-1">
              <TabsTrigger className="gap-1.5" value="urgent">
                Urgent <TabCount value={urgentMatters.length} />
              </TabsTrigger>
              <TabsTrigger className="gap-1.5" value="tasks">
                My Tasks <TabCount value={dashboard.myTasks.length} />
              </TabsTrigger>
              <TabsTrigger className="gap-1.5" value="deadlines">
                Deadlines <TabCount value={dashboard.upcomingDeadlines.length} />
              </TabsTrigger>
              <TabsTrigger className="gap-1.5" value="followup">
                Follow-Up <TabCount value={followUpMatters.length} />
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4 space-y-2" value="urgent">
              {urgentMatters.length > 0 ? (
                <>
                  {urgentMatters.slice(0, 5).map((matter) => <UrgentMatterRow key={matter.snapshot.id} matter={matter} />)}
                  <ViewAllLink count={urgentMatters.length} href={dashboardMatterLinks.urgent} label="urgent matters" />
                </>
              ) : (
                <InlineEmpty description="No overdue actions, urgent deadlines, or missing information right now." title="Nothing urgent" />
              )}
            </TabsContent>

            <TabsContent className="mt-4 space-y-2" value="tasks">
              {dashboard.myTasks.length > 0 ? (
                <>
                  {dashboard.myTasks.slice(0, 5).map((task) => (
                    <CompactRow
                      href={`/matters/${task.matterId}#tasks`}
                      key={task.id}
                      meta={`${task.carrierName} · ${task.dueDate ? `Due ${task.dueDate}` : "No due date"}`}
                      right={<StatusBadge status={taskStatusLabels[task.status] as MatterStatus} />}
                      title={`${task.title} · ${task.matterName}`}
                    />
                  ))}
                  <ViewAllLink count={dashboard.myTasks.length} href={dashboardMatterLinks.tasks} label="tasks" />
                </>
              ) : (
                <InlineEmpty description="You have no overdue tasks or tasks due soon." title="You are caught up" />
              )}
            </TabsContent>

            <TabsContent className="mt-4 space-y-2" value="deadlines">
              {dashboard.upcomingDeadlines.length > 0 ? (
                <>
                  {dashboard.upcomingDeadlines.slice(0, 5).map((deadline) => (
                    <CompactRow
                      href={`/matters/${deadline.matterId}#deadlines`}
                      key={deadline.id}
                      meta={`${deadline.deadlineType.replaceAll("_", " ")} · ${deadline.daysRemaining < 0 ? `${Math.abs(deadline.daysRemaining)} days overdue` : `${deadline.daysRemaining} days remaining`} · ${deadline.isVerified ? "Verified" : "Needs verification"}`}
                      right={<DateDisplay value={deadline.deadlineDate} />}
                      title={`${deadline.title} · ${deadline.matterName}`}
                    />
                  ))}
                  <ViewAllLink count={dashboard.upcomingDeadlines.length} href={dashboardMatterLinks.deadlines} label="deadlines" />
                </>
              ) : (
                <InlineEmpty description="No recorded deadlines fall within the tracked window." title="No deadlines approaching" />
              )}
            </TabsContent>

            <TabsContent className="mt-4 space-y-2" value="followup">
              {followUpMatters.length > 0 ? (
                <>
                  {followUpMatters.slice(0, 5).map((matter) => (
                    <CompactRow
                      href={`/matters/${matter.snapshot.id}#attention`}
                      key={matter.snapshot.id}
                      meta={`${matter.primaryFlag?.suggestedAction ?? "Review the next step"} · ${matter.snapshot.assignedFirmUser}`}
                      right={matter.primaryFlag ? <TriageSeverityBadge severity={matter.primaryFlag.severity} /> : null}
                      title={`${matter.snapshot.matterName} · ${matter.primaryFlag?.title ?? "Follow-up needed"}`}
                    />
                  ))}
                  <ViewAllLink count={followUpMatters.length} href={dashboardMatterLinks.followUp} label="follow-up matters" />
                </>
              ) : (
                <InlineEmpty description="No matters are waiting on a response or stuck without a next action." title="Nothing waiting on follow-up" />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Insights</h2>
          <p className="text-sm text-muted-foreground">Lower-priority information you can check when you have time.</p>
        </div>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <Tabs defaultValue="ready">
              <TabsList className="min-h-11 w-full flex-wrap items-stretch justify-start gap-1 bg-secondary p-1">
                <TabsTrigger value="ready">Ready for Demand <TabCount value={dashboard.readyForDemand.length} /></TabsTrigger>
                <TabsTrigger value="opportunities">High-Value Opportunities <TabCount value={dashboard.highValueOpportunities.length} /></TabsTrigger>
                <TabsTrigger value="assessment">Assessment Needed <TabCount value={dashboard.assessmentNeeded.length} /></TabsTrigger>
                <TabsTrigger value="referrals">New Referrals <TabCount value={dashboard.newReferrals.length} /></TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                {dashboard.workload.length > 0 ? <TabsTrigger value="workload">Workload</TabsTrigger> : null}
              </TabsList>

              <TabsContent className="mt-4 space-y-2" value="ready">
                {dashboard.readyForDemand.length > 0 ? (
                  dashboard.readyForDemand.map((matter) => (
                    <CompactRow
                      href={`/matters/${matter.snapshot.id}#attention`}
                      key={matter.snapshot.id}
                      meta={`${matter.snapshot.carrierName} · ${matter.snapshot.liabilityAssessment} liability · ${matter.snapshot.insuranceStatus.replaceAll("_", " ")}`}
                      right={<CurrencyDisplay value={matter.snapshot.amountSought} />}
                      title={`${matter.snapshot.matterName} · Ready for attorney confirmation`}
                    />
                  ))
                ) : (
                  <InlineEmpty
                    description="A matter will appear here once its liability, amount, recipient, and supporting evidence are complete."
                    title="No matters are ready for demand yet"
                  />
                )}
              </TabsContent>

              <TabsContent className="mt-4 space-y-2" value="opportunities">
                {dashboard.highValueOpportunities.length > 0 ? (
                  dashboard.highValueOpportunities.map((summary) => (
                    <CompactRow
                      href={`/matters/${summary.matterId}/assessment`}
                      key={summary.matterId}
                      meta={`${summary.current?.viabilityScore ?? 0}/100 viability · ${summary.current?.dataCompletenessPercentage ?? 0}% complete · ${summary.assignedAttorneyName ?? "Unassigned"}`}
                      right={<CurrencyDisplay value={summary.current?.expectedNetValue ?? 0} />}
                      title={`${summary.matterName} · High expected value`}
                    />
                  ))
                ) : (
                  <InlineEmpty
                    description="Matters appear here once a finished assessment shows strong expected value."
                    title="No standout opportunities yet"
                  />
                )}
              </TabsContent>

              <TabsContent className="mt-4 space-y-2" value="assessment">
                {dashboard.assessmentNeeded.length > 0 ? (
                  dashboard.assessmentNeeded.map((matter) => (
                    <CompactRow
                      href={`/matters/${matter.snapshot.id}/assessment`}
                      key={matter.snapshot.id}
                      meta={`${matter.snapshot.carrierName} · ${matter.snapshot.assignedFirmUser}`}
                      right={<span className="font-medium text-primary">Start assessment</span>}
                      title={`${matter.snapshot.matterName} · ${matter.snapshot.amountSought.toLocaleString()}`}
                    />
                  ))
                ) : (
                  <InlineEmpty description="Matters that pass initial review will appear here for assessment." title="No assessments are needed right now" />
                )}
              </TabsContent>

              <TabsContent className="mt-4 space-y-2" value="referrals">
                {dashboard.newReferrals.length > 0 ? (
                  dashboard.newReferrals.map((matter) => (
                    <CompactRow
                      href={`/matters/${matter.snapshot.id}`}
                      key={matter.snapshot.id}
                      meta={`${matter.snapshot.carrierName} · ${matter.snapshot.assignedFirmUser}`}
                      right={matter.primaryFlag ? <TriageSeverityBadge severity={matter.primaryFlag.severity} /> : null}
                      title={matter.snapshot.matterName}
                    />
                  ))
                ) : (
                  <InlineEmpty description="New and recently reviewed referrals will appear here." title="No referrals need review" />
                )}
              </TabsContent>

              <TabsContent className="mt-4 space-y-2" value="activity">
                {dashboard.recentActivity.length > 0 ? (
                  dashboard.recentActivity.map((activity) => (
                    <CompactRow
                      href={`/matters/${activity.matterId}#activity`}
                      key={`${activity.id}-${activity.matterId}`}
                      meta={`${activity.actorName ?? "Recovery Hub"} · ${new Date(activity.occurredAt).toLocaleString()}`}
                      title={`${activity.label} · ${activity.matterName}`}
                    />
                  ))
                ) : (
                  <InlineEmpty description="New matter events will appear here after they are recorded." title="No recent activity" />
                )}
              </TabsContent>

              {dashboard.workload.length > 0 ? (
                <TabsContent className="mt-4" value="workload">
                  <p className="mb-3 text-sm text-muted-foreground">How active work is distributed across the firm. This is not a productivity ranking.</p>
                  <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                    {dashboard.workload.map((item) => (
                      <div className="rounded-lg bg-secondary/60 p-4" key={item.userName}>
                        <h3 className="font-semibold text-foreground">{item.userName}</h3>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <Metric label="Active matters" value={item.activeMatters} />
                          <Metric label="Overdue actions" value={item.overdueNextActions} />
                          <Metric label="Upcoming deadlines" value={item.upcomingDeadlines} />
                          <Metric label="Open tasks" value={item.openTasks} />
                          <Metric label="Ready for demand" value={item.readyForDemand} />
                          <Metric label="Stale matters" value={item.staleMatters} />
                        </dl>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ) : null}
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function dedupeMatters(matters: DashboardMatter[]): DashboardMatter[] {
  const seen = new Map<string, DashboardMatter>();
  for (const matter of matters) {
    if (!seen.has(matter.snapshot.id)) seen.set(matter.snapshot.id, matter);
  }
  return [...seen.values()];
}

function greetingFromDate(iso: string) {
  const hour = new Date(iso).getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function TabCount({ value }: { value: number }) {
  if (value === 0) return null;
  return <span className="tab-count rounded-full bg-background px-1.5 py-0.5 text-xs font-semibold text-foreground">{value}</span>;
}

const todayMetricTone: Record<"urgent" | "warning" | "success" | "neutral", string> = {
  urgent: "text-[var(--urgent)]",
  warning: "text-[var(--warning)]",
  success: "text-[var(--success)]",
  neutral: "text-primary",
};

function TodayMetric({ label, count, href, tone }: { label: string; count: number; href: string; tone: "urgent" | "warning" | "success" | "neutral" }) {
  const isZero = count === 0;

  return (
    <Link
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors",
        isZero ? "border-border bg-secondary/50 hover:bg-secondary" : "border-border bg-card shadow-sm hover:border-primary/30"
      )}
      href={href}
    >
      <span className={cn("text-sm font-medium", isZero ? "text-muted-foreground" : "text-foreground")}>{label}</span>
      <span className={cn("text-xl font-semibold", isZero ? "text-muted-foreground" : todayMetricTone[tone])}>{count}</span>
    </Link>
  );
}

function UrgentMatterRow({ matter }: { matter: DashboardMatter }) {
  const flag = matter.primaryFlag;
  const otherFlags = matter.flags.filter((item) => item !== flag);
  const borderTone =
    flag?.severity === "critical"
      ? "border-l-[color:var(--urgent)]"
      : flag?.severity === "high"
        ? "border-l-[color:var(--warning)]"
        : "border-l-primary";

  return (
    <div className={cn("rounded-lg border border-l-4 border-border bg-background p-3 transition-colors hover:border-primary/30", borderTone)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link className="font-semibold text-foreground hover:underline" href={`/matters/${matter.snapshot.id}`}>
              {matter.snapshot.matterName}
            </Link>
            {flag ? <TriageSeverityBadge severity={flag.severity} /> : null}
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">{flag?.title ?? "No current issue"}</p>
          {otherFlags.length > 0 ? (
            <details className="mt-1 group/details">
              <summary className="cursor-pointer text-sm font-medium text-primary select-none">
                {otherFlags.length} more {otherFlags.length === 1 ? "issue" : "issues"}
              </summary>
              <ul className="mt-2 space-y-1 border-l-2 border-border pl-3 text-sm text-muted-foreground">
                {otherFlags.map((item) => (
                  <li key={item.ruleKey}>{item.title}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4 lg:shrink-0 lg:text-right">
          <MiniField label="Responsible" value={matter.snapshot.assignedFirmUser} />
          <MiniField label="Due" value={matter.snapshot.nextActionDueDate ? <DateDisplay value={matter.snapshot.nextActionDueDate} /> : "Not set"} />
          <MiniField label="Amount" value={<CurrencyDisplay value={matter.snapshot.amountSought} />} />
          <Button asChild size="sm" variant="outline">
            <Link href={`/matters/${matter.snapshot.id}`}>Open Matter</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

function CompactRow({ title, meta, href, right }: { title: string; meta: string; href: string; right?: ReactNode }) {
  return (
    <Link className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between" href={href}>
      <span className="min-w-0 flex-1">
        <span className="block font-medium leading-5 text-foreground [overflow-wrap:anywhere]">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere]">{meta}</span>
      </span>
      {right ? <span className="shrink-0 text-sm text-muted-foreground">{right}</span> : null}
    </Link>
  );
}

function ViewAllLink({ count, href, label }: { count: number; href: string; label: string }) {
  if (count <= 5) return null;
  return (
    <Button asChild className="mt-1" variant="link">
      <Link href={href}>View all {count} {label}</Link>
    </Button>
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
