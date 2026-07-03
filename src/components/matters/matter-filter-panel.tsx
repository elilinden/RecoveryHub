import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const filters = [
  "Assigned adjuster",
  "Days since activity",
  "Overdue next action",
  "Missing next action",
  "Unverified statute deadline",
  "Stale matters",
  "Amount sought",
  "Matter stage",
  "Priority",
];

export function MatterFilterPanel() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Available filters</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Stale matter means no substantive matter activity for the configured follow-up period. These controls are visual scaffolding until the database-backed matter workflow is active.
          </p>
        </div>
        <Button className="w-fit" type="button" variant="ghost">
          Clear All Filters
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Badge className="h-7 rounded-full px-3 text-[13px]" key={filter} variant="outline">
            {filter}
          </Badge>
        ))}
      </div>
    </div>
  );
}
