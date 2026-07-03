import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTableColumn = {
  key: string;
  header: string;
  className?: string;
};

type DataTableShellProps = {
  columns: DataTableColumn[];
  children: ReactNode;
  className?: string;
};

export function DataTableShell({ columns, children, className }: DataTableShellProps) {
  return (
    <Card className={cn("min-w-0 overflow-hidden border-border bg-card shadow-sm", className)}>
      <CardContent className="p-0">
        <div
          aria-label="Scrollable data table"
          className="relative max-w-full overflow-x-auto focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-card after:to-transparent"
          role="region"
          tabIndex={0}
        >
          <Table className="min-w-max table-fixed">
            <TableHeader className="sticky top-0 z-20 bg-card">
              <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                {columns.map((column) => (
                  <TableHead className={cn("h-10 px-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground", column.className)} key={column.key}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{children}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
