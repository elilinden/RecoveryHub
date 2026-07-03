import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

type FormFieldWrapperProps = {
  label: string;
  description?: string;
  children: ReactNode;
};

export function FormFieldWrapper({ label, description, children }: FormFieldWrapperProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
