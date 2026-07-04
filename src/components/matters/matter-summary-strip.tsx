import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type SummaryField = {
  label: string;
  value: ReactNode;
};

export function MatterSummaryStrip({ fields }: { fields: SummaryField[] }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-[repeat(9,minmax(0,1fr))]">
        {fields.map((field) => (
          <div className="min-w-0" key={field.label}>
            <p className="break-words text-xs text-muted-foreground">{field.label}</p>
            <p className="mt-1 break-words text-[15px] font-semibold leading-5 text-foreground">{field.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
