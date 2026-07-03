"use client";

import type { ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type StatusBadgeListItem = {
  key: string;
  node: ReactNode;
};

type StatusBadgeListProps = {
  items: StatusBadgeListItem[];
  max?: number;
};

export function StatusBadgeList({ items, max = 3 }: StatusBadgeListProps) {
  const visible = items.slice(0, max);
  const hidden = items.slice(max);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((item) => (
        <span key={item.key}>{item.node}</span>
      ))}
      {hidden.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Show ${hidden.length} more status${hidden.length === 1 ? "" : "es"}`}
              className="inline-flex h-6 items-center rounded-full border border-border bg-secondary px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              type="button"
            >
              +{hidden.length} more
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="flex w-auto max-w-64 flex-wrap gap-1.5 p-2">
            {hidden.map((item) => (
              <span key={item.key}>{item.node}</span>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
