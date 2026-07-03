import { AlertCircle, CheckCircle2, Clock3, FileWarning, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  documentStatusLabels,
  packageStatusLabels,
  scanStatusLabels,
  validationSeverityLabels,
  verificationStatusLabels,
  visibilityLabels,
} from "@/lib/documents-packages/labels";
import type {
  DocumentScanStatus,
  DocumentStatus,
  DocumentVisibility,
  OutboundPackageStatus,
  PackageValidationSeverity,
  VerificationStatus,
} from "@/lib/documents-packages/types";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "urgent" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-secondary text-foreground",
  success: "border-[color:var(--success)]/20 bg-[var(--success-muted)] text-[var(--success)]",
  warning: "border-[color:var(--warning)]/20 bg-[var(--warning-muted)] text-[var(--warning)]",
  urgent: "border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] text-[var(--urgent)]",
  info: "border-primary/15 bg-[var(--info-muted)] text-primary",
};

function CompactBadge({ children, tone, className }: { children: ReactNode; tone: BadgeTone; className?: string }) {
  return (
    <Badge className={cn("h-6 rounded-full px-2.5 text-[13px]", toneClasses[tone], className)} variant="outline">
      {children}
    </Badge>
  );
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const tone: BadgeTone = status === "available" ? "success" : status === "quarantined" || status === "failed" ? "urgent" : status === "archived" || status === "superseded" ? "neutral" : "warning";
  const Icon = tone === "success" ? CheckCircle2 : tone === "urgent" ? AlertCircle : Clock3;
  return <CompactBadge tone={tone}><Icon aria-hidden="true" className="size-3.5" />{documentStatusLabels[status]}</CompactBadge>;
}

export function ScanStatusBadge({ status }: { status: DocumentScanStatus }) {
  const tone: BadgeTone = status === "clean" ? "success" : status === "flagged" || status === "scan_failed" ? "urgent" : "warning";
  const Icon = status === "clean" ? ShieldCheck : status === "flagged" ? FileWarning : Clock3;
  return <CompactBadge tone={tone}><Icon aria-hidden="true" className="size-3.5" />{scanStatusLabels[status]}</CompactBadge>;
}

export function VisibilityBadge({ visibility }: { visibility: DocumentVisibility }) {
  const tone: BadgeTone = visibility === "restricted" ? "urgent" : visibility === "package_eligible" ? "success" : "neutral";
  return <CompactBadge tone={tone}>{visibility === "restricted" ? <LockKeyhole aria-hidden="true" className="size-3.5" /> : null}{visibilityLabels[visibility]}</CompactBadge>;
}

export function PackageStatusBadge({ status }: { status: OutboundPackageStatus }) {
  const tone: BadgeTone = status === "approved_for_send" ? "success" : status === "ready_for_review" ? "info" : status === "changes_requested" || status === "validation_needed" ? "warning" : status === "canceled" ? "neutral" : "info";
  return <CompactBadge tone={tone}>{packageStatusLabels[status]}</CompactBadge>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const tone: BadgeTone = status === "verified" ? "success" : status === "rejected" || status === "outdated" ? "urgent" : "warning";
  return <CompactBadge tone={tone}>{verificationStatusLabels[status]}</CompactBadge>;
}

export function ValidationSeverityBadge({ severity }: { severity: PackageValidationSeverity }) {
  const tone: BadgeTone = severity === "critical" || severity === "high" ? "urgent" : severity === "medium" ? "warning" : severity === "informational" ? "info" : "neutral";
  return <CompactBadge tone={tone}>{validationSeverityLabels[severity]}</CompactBadge>;
}
