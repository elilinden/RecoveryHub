import { CheckCircle2, Clock3 } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { ProfileRole } from "@/lib/data/profiles";
import { roleLabels } from "@/lib/users/labels";
import type { UserAccountStatus } from "@/lib/users/types";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-secondary text-foreground",
  success: "border-[color:var(--success)]/20 bg-[var(--success-muted)] text-[var(--success)]",
  warning: "border-[color:var(--warning)]/20 bg-[var(--warning-muted)] text-[var(--warning)]",
  info: "border-primary/15 bg-[var(--info-muted)] text-primary",
};

function CompactBadge({ children, tone, className }: { children: ReactNode; tone: BadgeTone; className?: string }) {
  return (
    <Badge className={cn("h-6 rounded-full px-2.5 text-[13px]", toneClasses[tone], className)} variant="outline">
      {children}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: ProfileRole }) {
  const tone: BadgeTone = role === "admin" ? "info" : "neutral";
  return <CompactBadge tone={tone}>{roleLabels[role]}</CompactBadge>;
}

export function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return <CompactBadge tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</CompactBadge>;
}

export function AccountStatusBadge({ status }: { status: UserAccountStatus }) {
  const tone: BadgeTone = status === "confirmed" ? "success" : "warning";
  const Icon = status === "confirmed" ? CheckCircle2 : Clock3;
  return (
    <CompactBadge tone={tone}>
      <Icon aria-hidden="true" className="size-3.5" />
      {status === "confirmed" ? "Confirmed" : "Invitation Pending"}
    </CompactBadge>
  );
}
