import type { ChangeEvent } from "react";

import { Input } from "@/components/ui/input";

export function TextField({ label, maxLength, name, onChange, value }: { label: string; maxLength?: number; name: string; onChange?: (event: ChangeEvent<HTMLInputElement>) => void; value: string }) {
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Input defaultValue={value} maxLength={maxLength} name={name} onChange={onChange} />
    </label>
  );
}

export function TextAreaField({
  className,
  label,
  name,
  rows = 2,
  value,
}: {
  className?: string;
  label: string;
  name: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className={`min-w-0 space-y-1 text-sm font-medium text-foreground ${className ?? ""}`}>
      <span>{label}</span>
      <textarea
        className="min-h-20 w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm leading-5 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        defaultValue={value}
        name={name}
        rows={rows}
      />
    </label>
  );
}

export function DateField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Input className="h-10" defaultValue={value} name={name} type="date" />
    </label>
  );
}

export function MoneyField({ label, name, value }: { label: string; name: string; value: number }) {
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Input defaultValue={value.toFixed(2)} inputMode="decimal" name={name} />
    </label>
  );
}

export function SelectField({ label, name, value, options }: { label: string; name: string; value: string; options: Array<[string, string]> }) {
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select className="h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm" defaultValue={value} name={name}>
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
