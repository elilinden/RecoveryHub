"use client";

import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MatterActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="More matter actions" size="icon-lg" type="button" variant="outline">
          <MoreHorizontal aria-hidden="true" className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Matter actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Export summary</DropdownMenuItem>
        <DropdownMenuItem>Request documents</DropdownMenuItem>
        <DropdownMenuItem>Mark for review</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
