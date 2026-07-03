import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type DetailSummaryCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
};

export function DetailSummaryCard({ label, value, description }: DetailSummaryCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  );
}
