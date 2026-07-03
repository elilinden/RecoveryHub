"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type MatterWorkTab = {
  value: string;
  label: string;
  content: ReactNode;
  /** URL hashes that should deep-link into this tab, e.g. "attention", "tasks". */
  hashes?: string[];
};

type MatterDetailWorkspaceProps = {
  tabs: MatterWorkTab[];
  defaultTab: string;
  openIssueCount: number;
  mostCriticalTitle: string;
  mostCriticalExplanation: string | null;
  responsibleUser: string | null;
  dueDate: ReactNode;
  reviewAllTab: string;
};

export function MatterDetailWorkspace({
  tabs,
  defaultTab,
  openIssueCount,
  mostCriticalTitle,
  mostCriticalExplanation,
  responsibleUser,
  dueDate,
  reviewAllTab,
}: MatterDetailWorkspaceProps) {
  // Server and first client render must agree on `defaultTab` to avoid a
  // hydration mismatch, so the hash-based deep link is applied afterward.
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const match = tabs.find((tab) => tab.hashes?.includes(hash));
    if (!match) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing initial tab from the URL hash, a browser API outside React's state.
    setActiveTab(match.value);
    const frame = requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time deep-link check on mount only.
  }, []);

  return (
    <>
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {openIssueCount === 0 ? "No open issues" : `${openIssueCount} open ${openIssueCount === 1 ? "issue" : "issues"}`}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{mostCriticalTitle}</p>
            {mostCriticalExplanation ? <p className="text-sm text-muted-foreground">{mostCriticalExplanation}</p> : null}
            {openIssueCount > 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Responsible: <span className="font-medium text-foreground">{responsibleUser ?? "Not assigned"}</span>
                {" · "}Due: <span className="font-medium text-foreground">{dueDate}</span>
              </p>
            ) : null}
          </div>
          {openIssueCount > 0 ? (
            <Button className="shrink-0" onClick={() => setActiveTab(reviewAllTab)} type="button" variant="outline">
              Review All
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Tabs className="space-y-4" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="min-h-11 w-full flex-wrap items-stretch justify-start gap-1 rounded-lg border border-border bg-card p-1 [&_[data-slot=tabs-trigger]]:flex-none [&_[data-slot=tabs-trigger]]:px-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
