"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <Card className="border-[color:var(--warning)]/20 bg-card shadow-sm">
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--warning-muted)] text-[var(--warning)]">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Dashboard could not load</h2>
            <p className="mt-1 text-sm text-muted-foreground">Try again. Other Recovery Hub pages are still available from the sidebar.</p>
          </div>
        </div>
        <Button onClick={reset} variant="outline">Retry</Button>
      </CardContent>
    </Card>
  );
}
