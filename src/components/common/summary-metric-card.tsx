import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SummaryMetric } from "@/lib/types";

type SummaryMetricCardProps = {
  metric: SummaryMetric;
};

const toneClasses: Record<SummaryMetric["tone"], string> = {
  neutral: "text-primary bg-[var(--info-muted)]",
  success: "text-[var(--success)] bg-[var(--success-muted)]",
  warning: "text-[var(--warning)] bg-[var(--warning-muted)]",
  urgent: "text-[var(--urgent)] bg-[var(--urgent-muted)]",
};

export function SummaryMetricCard({ metric }: SummaryMetricCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm transition-colors hover:border-primary/30">
      <CardContent className="p-5">
        <Link className="group block focus-visible:rounded-md" href={metric.href}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{metric.count}</p>
            </div>
            <span className={cn("rounded-full p-2", toneClasses[metric.tone])}>
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{metric.description}</p>
          {metric.trend ? <p className="mt-2 text-sm font-medium text-foreground">{metric.trend}</p> : null}
        </Link>
      </CardContent>
    </Card>
  );
}
