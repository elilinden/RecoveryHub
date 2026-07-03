import type { ComponentType } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock3,
  FileCheck2,
  FileQuestion,
  Gavel,
  Inbox,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MatterStatus } from "@/lib/types";

type Tone = "neutral" | "success" | "warning" | "urgent" | "info";

type StatusBadgeProps = {
  status: MatterStatus;
  className?: string;
  title?: string;
  ariaLabel?: string;
};

const toneClasses: Record<Tone, string> = {
  neutral: "border-border bg-secondary text-foreground",
  success: "border-[color:var(--success)]/20 bg-[var(--success-muted)] text-[var(--success)]",
  warning: "border-[color:var(--warning)]/20 bg-[var(--warning-muted)] text-[var(--warning)]",
  urgent: "border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] text-[var(--urgent)]",
  info: "border-[color:var(--info)]/15 bg-[var(--info-muted)] text-[var(--info)]",
};

const statusConfig: Record<MatterStatus, { tone: Tone; icon: ComponentType<{ className?: string }> }> = {
  Urgent: { tone: "urgent", icon: AlertCircle },
  "High priority": { tone: "warning", icon: AlertCircle },
  Normal: { tone: "neutral", icon: Circle },
  "Low priority": { tone: "neutral", icon: Circle },
  "Missing information": { tone: "warning", icon: FileQuestion },
  "Ready for demand": { tone: "success", icon: FileCheck2 },
  "Under review": { tone: "info", icon: Search },
  "Awaiting client": { tone: "warning", icon: Clock3 },
  "No immediate action": { tone: "neutral", icon: CheckCircle2 },
  "New referral": { tone: "info", icon: Inbox },
  "Initial review": { tone: "info", icon: Search },
  Investigation: { tone: "info", icon: Search },
  "Demand pending": { tone: "success", icon: Gavel },
  Negotiation: { tone: "warning", icon: Gavel },
  "Arbitration review": { tone: "warning", icon: Gavel },
  "Litigation review": { tone: "warning", icon: Gavel },
  "Recovery received": { tone: "success", icon: CheckCircle2 },
  Closed: { tone: "success", icon: CheckCircle2 },
  "Auto subrogation": { tone: "info", icon: ShieldCheck },
  "Property damage": { tone: "info", icon: ShieldCheck },
  "Workers' compensation recovery": { tone: "info", icon: ShieldCheck },
  "Health-plan recovery": { tone: "info", icon: ShieldCheck },
  "Commercial loss": { tone: "info", icon: ShieldCheck },
  "Product-related loss": { tone: "info", icon: ShieldCheck },
  "Construction loss": { tone: "info", icon: ShieldCheck },
  "Insurance defense": { tone: "info", icon: ShieldCheck },
  Other: { tone: "neutral", icon: Circle },
  "Deadline verified": { tone: "success", icon: CheckCircle2 },
  "Unverified statute deadline": { tone: "urgent", icon: AlertCircle },
  "Action overdue": { tone: "urgent", icon: Clock3 },
  "Stale matter": { tone: "warning", icon: Clock3 },
  "Awaiting overdue response": { tone: "warning", icon: Clock3 },
  "No next action": { tone: "warning", icon: FileQuestion },
  "Deadline soon": { tone: "info", icon: Clock3 },
  "Draft intake": { tone: "warning", icon: FileQuestion },
  "Intake in progress": { tone: "info", icon: Clock3 },
  "Intake complete": { tone: "success", icon: CheckCircle2 },
};

export function StatusBadge({ status, className, title, ariaLabel }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { tone: "neutral" as const, icon: Circle };
  const Icon = config.icon;

  return (
    <Badge
      aria-label={ariaLabel}
      title={title}
      variant="outline"
      className={cn("h-6 rounded-full px-2.5 text-[13px]", toneClasses[config.tone], className)}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {status}
    </Badge>
  );
}
