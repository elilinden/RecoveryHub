import Link from "next/link";
import { ClipboardList, Pencil, PlusCircle } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { FollowUpIndicators } from "@/components/common/follow-up-indicators";
import { PageHeader } from "@/components/common/page-header";
import { SectionHeader } from "@/components/common/section-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DetailSummaryCard } from "@/components/matters/detail-summary-card";
import { MatterActionsMenu } from "@/components/matters/matter-actions-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activityItems, getMatterById, matters } from "@/lib/mock-data";

type MatterDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export function generateStaticParams() {
  return matters.map((matter) => ({ id: matter.id }));
}

export default async function MatterDetailPage({ params }: MatterDetailPageProps) {
  const { id } = await params;
  const matter = getMatterById(id);
  const matterActivity = activityItems.filter((item) => item.matterId === matter.id);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button className="h-10 gap-2" type="button" variant="outline">
              <Pencil aria-hidden="true" className="size-4" />
              Edit Matter
            </Button>
            <Button className="h-10 gap-2" type="button">
              <PlusCircle aria-hidden="true" className="size-4" />
              Add Task
            </Button>
            <MatterActionsMenu />
          </>
        }
        subtitle={`${matter.carrier} · Claim ${matter.claimNumber}`}
        title={matter.name}
      />

      <div className="flex flex-wrap gap-2">
        <StatusBadge status="Auto subrogation" />
        <StatusBadge status={matter.stage} />
        <StatusBadge status={matter.priority} />
        {matter.deadlineVerified ? <StatusBadge status="Deadline verified" /> : null}
        {!matter.deadlineVerified ? <StatusBadge status="Unverified statute deadline" /> : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Matter summary">
        <DetailSummaryCard label="Amount sought" value={<CurrencyDisplay value={matter.amountSought} />} />
        <DetailSummaryCard label="Amount recovered" value={<CurrencyDisplay value={matter.amountRecovered} />} />
        <DetailSummaryCard label="Statute deadline" value={<DateDisplay value={matter.statuteDeadline} />} />
        <DetailSummaryCard description={matter.nextAction} label="Current stage" value={matter.stage} />
        <DetailSummaryCard label="Intake status" value={matter.intakeStatus ?? "Complete"} />
      </section>

      <Tabs className="space-y-4" defaultValue="overview">
        <TabsList className="min-h-11 w-full flex-wrap items-stretch justify-start gap-1 rounded-lg border border-border bg-card p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <SectionHeader title="Matter Overview" />
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{matter.notes}</p>
                <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <dt className="text-sm text-muted-foreground">Assigned attorney</dt>
                    <dd className="mt-1 font-medium text-foreground">{matter.assignedAttorney}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <dt className="text-sm text-muted-foreground">Assigned firm user</dt>
                    <dd className="mt-1 font-medium text-foreground">{matter.assignedPerson}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <dt className="text-sm text-muted-foreground">Assigned adjuster</dt>
                    <dd className="mt-1 font-medium text-foreground">{matter.assignedAdjuster}</dd>
                  </div>
                  {matter.carrierSupervisor ? (
                    <div className="rounded-lg border border-border bg-background p-4">
                      <dt className="text-sm text-muted-foreground">Carrier supervisor</dt>
                      <dd className="mt-1 font-medium text-foreground">{matter.carrierSupervisor}</dd>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-border bg-background p-4">
                    <dt className="text-sm text-muted-foreground">Next-action due date</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {matter.nextActionDueDate ? <DateDisplay value={matter.nextActionDueDate} /> : "Not set"}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <dt className="text-sm text-muted-foreground">Days since substantive activity</dt>
                    <dd className="mt-1 font-medium text-foreground">{matter.daysSinceLastSubstantiveActivity} days</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <dt className="text-sm text-muted-foreground">Deadline verification</dt>
                    <dd className="mt-2">
                      <StatusBadge status={matter.deadlineVerified ? "Deadline verified" : "Unverified statute deadline"} />
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4">
                    <dt className="text-sm text-muted-foreground">Intake status</dt>
                    <dd className="mt-1 font-medium text-foreground">{matter.intakeStatus ?? "Complete"}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-4 sm:col-span-2 xl:col-span-3">
                    <dt className="text-sm text-muted-foreground">Follow-up indicators</dt>
                    <dd className="mt-2">
                      <FollowUpIndicators includeUpcoming reasons={matter.followUpReasons} />
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-lg border border-border bg-background p-5">
                <div className="flex items-center gap-2">
                  <ClipboardList aria-hidden="true" className="size-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Next action</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{matter.nextAction ?? "No next action assigned."}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
              <DetailSummaryCard label="Demand target" value={<CurrencyDisplay value={matter.amountSought} />} />
              <DetailSummaryCard label="Recovered" value={<CurrencyDisplay value={matter.amountRecovered} />} />
              <DetailSummaryCard
                label="Open balance"
                value={<CurrencyDisplay value={matter.amountSought - matter.amountRecovered} />}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6">
              <SectionHeader description="Static placeholders for the future evidence checklist." title="Evidence" />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {["Loss report", "Payment ledger", "Responsible party details"].map((item) => (
                  <div className="rounded-lg border border-border bg-background p-4 text-sm font-medium text-foreground" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6">
              <SectionHeader description="Deadline tracking will become interactive in a later phase." title="Deadlines" />
              <div className="mt-5 rounded-lg border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Statute deadline</p>
                <DateDisplay className="mt-1 block font-semibold text-foreground" value={matter.statuteDeadline} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6">
              <SectionHeader description="Task assignment and completion will be added later." title="Tasks" />
              <div className="mt-5 rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                No functional tasks yet. The next-action summary is reserved above.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6">
              <SectionHeader title="Activity" />
              <div className="mt-5 space-y-4">
                {matterActivity.map((item) => (
                  <div className="rounded-lg border border-border bg-background p-4" key={item.id}>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <DateDisplay className="text-sm text-muted-foreground" value={item.date} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button asChild variant="link">
        <Link href="/matters">Back to matters</Link>
      </Button>
    </div>
  );
}
