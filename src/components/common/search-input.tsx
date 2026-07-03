import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type SearchInputProps = {
  label: string;
  placeholder: string;
  defaultValue?: string;
};

export function SearchInput({ label, placeholder, defaultValue }: SearchInputProps) {
  return (
    <label className="relative block w-full sm:max-w-sm">
      <span className="sr-only">{label}</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-10 rounded-lg border-border bg-card pl-9 text-sm shadow-sm"
        defaultValue={defaultValue}
        placeholder={placeholder}
        type="search"
      />
    </label>
  );
}
