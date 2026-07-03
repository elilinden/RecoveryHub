"use client";

import { Bookmark, PlusCircle, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { saveCurrentMatterViewAction } from "@/lib/data/saved-view-actions";
import type { SavedView } from "@/lib/types";

type SavedViewsControlProps = {
  views: SavedView[];
};

export function SavedViewsControl({ views }: SavedViewsControlProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-10 gap-2" type="button" variant="outline">
          <Bookmark aria-hidden="true" className="size-4" />
          Saved Views
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Saved matter views</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {views.map((view) => (
          <DropdownMenuItem className="flex items-start gap-3 py-3" key={view.id}>
            <UsersRound aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{view.name}</span>
                <Badge className="rounded-full" variant="outline">
                  {view.scope}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{view.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <form action={saveCurrentMatterViewAction} className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="saved-view-name">
              Save current filters as a personal view
            </label>
            <div className="flex gap-2">
              <Input id="saved-view-name" name="name" placeholder="View name" />
              <Button aria-label="Save view" size="icon-lg" type="submit">
                <PlusCircle aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </form>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
