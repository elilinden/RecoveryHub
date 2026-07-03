import { Input } from "@/components/ui/input";

export function TextField({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="min-w-0 space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <Input defaultValue={value} name={name} />
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
