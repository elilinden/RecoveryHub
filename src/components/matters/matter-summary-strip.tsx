import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type SummaryField = {
  label: string;
  value: ReactNode;
};

export function MatterSummaryStrip({ fields }: { fields: SummaryField[] }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 lg:grid-cols-9">
        {fields.map((field) => (
          <div key={field.label}>
            <p className="text-xs text-muted-foreground">{field.label}</p>
            <p className="mt-1 truncate text-[15px] font-semibold text-foreground">{field.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
