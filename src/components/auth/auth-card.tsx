import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              RH
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Recovery Hub</p>
              <p className="text-xs text-muted-foreground">Internal legal operations</p>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </CardContent>
      </Card>
    </main>
  );
}
