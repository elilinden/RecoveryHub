import { AlertTriangle, CheckCircle2, Clock3, Info, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TriageSeverity } from "@/lib/triage/types";

type TriageSeverityBadgeProps = {
  severity: TriageSeverity;
  className?: string;
};

const config: Record<TriageSeverity, { label: string; className: string; icon: typeof Info }> = {
  critical: {
    label: "Critical",
    className: "border-[color:var(--urgent)]/30 bg-[var(--urgent-muted)] text-[var(--urgent)]",
    icon: ShieldAlert,
  },
  high: {
    label: "High",
    className: "border-[color:var(--warning)]/30 bg-[var(--warning-muted)] text-[var(--warning)]",
    icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    className: "border-border bg-secondary text-primary",
    icon: Clock3,
  },
  low: {
    label: "Low",
    className: "border-[color:var(--success)]/30 bg-[var(--success-muted)] text-[var(--success)]",
    icon: CheckCircle2,
  },
  informational: {
    label: "Info",
    className: "border-border bg-card text-muted-foreground",
    icon: Info,
  },
};

export function TriageSeverityBadge({ severity, className }: TriageSeverityBadgeProps) {
  const item = config[severity];
  const Icon = item.icon;

  return (
    <Badge className={cn("gap-1.5 whitespace-nowrap border px-2 py-1", item.className, className)} variant="outline">
      <Icon aria-hidden="true" className="size-3.5" />
      {item.label}
    </Badge>
  );
}
