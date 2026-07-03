import { Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/types";

type PriorityBadgeProps = {
  priority: Priority;
  className?: string;
};

const priorityClasses: Record<Priority, string> = {
  Urgent: "border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] text-[var(--urgent)]",
  "High priority": "border-[color:var(--warning)]/20 bg-[var(--warning-muted)] text-[var(--warning)]",
  Normal: "border-border bg-secondary text-foreground",
  "Low priority": "border-border bg-card text-muted-foreground",
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("h-6 rounded-full px-2.5 text-[13px]", priorityClasses[priority], className)}
    >
      <Flag aria-hidden="true" className="size-3.5" />
      {priority}
    </Badge>
  );
}
