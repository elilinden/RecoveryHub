import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

type FilterButtonProps = {
  label?: string;
};

export function FilterButton({ label = "Filter" }: FilterButtonProps) {
  return (
    <Button aria-label={label} className="h-10 gap-2" type="button" variant="outline">
      <SlidersHorizontal aria-hidden="true" className="size-4" />
      <span>{label}</span>
    </Button>
  );
}
