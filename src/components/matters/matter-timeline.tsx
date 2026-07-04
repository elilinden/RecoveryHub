"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteMatterEventAction, restoreMatterEventAction, strikeMatterEventAction, type WorkspaceActionResult } from "@/lib/matters-workspace/actions";
import { labelFromValue } from "@/lib/matters-workspace/labels";
import type { TimelineItem } from "@/lib/matters-workspace/types";
import { cn } from "@/lib/utils";

type MatterTimelineProps = {
  matterId: string;
  items: TimelineItem[];
  currentProfileId: string;
  isAdmin: boolean;
};

export function MatterTimeline({ matterId, items, currentProfileId, isAdmin }: MatterTimelineProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <TimelineRow currentProfileId={currentProfileId} isAdmin={isAdmin} item={item} key={`${item.kind}-${item.id}`} matterId={matterId} />
      ))}
    </div>
  );
}

type TimelineRowProps = {
  item: TimelineItem;
  matterId: string;
  currentProfileId: string;
  isAdmin: boolean;
};

function TimelineRow({ item, matterId, currentProfileId, isAdmin }: TimelineRowProps) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManualEvent = item.kind === "event" && item.source === "manual";
  const isOwn = item.actorId !== null && item.actorId === currentProfileId;
  const canModerate = isManualEvent && (isOwn || isAdmin);

  function runAction(action: (formData: FormData) => Promise<WorkspaceActionResult>) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("matterId", matterId);
      formData.set("eventId", item.id);
      const result = await action(formData);
      if (!result.ok) {
        setError(result.message);
      } else {
        setConfirmDelete(false);
      }
    });
  }

  return (
    <div className={cn("rounded-lg border border-border bg-background p-4", item.isStruckThrough && "bg-secondary/40")}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={item.kind === "event" ? "Ready for demand" : "Under review"} />
          <p className={cn("font-medium text-foreground", item.isStruckThrough && "text-muted-foreground line-through")}>
            {labelFromValue(item.label)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <time className="text-sm text-muted-foreground" dateTime={item.occurredAt}>
            {new Date(item.occurredAt).toLocaleString()}
          </time>
          {canModerate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="Entry actions" disabled={pending} size="icon-sm" type="button" variant="ghost">
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {item.isStruckThrough ? (
                  <DropdownMenuItem onSelect={() => runAction(restoreMatterEventAction)}>Restore</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => runAction(strikeMatterEventAction)}>Strike through</DropdownMenuItem>
                )}
                {isAdmin ? (
                  <DropdownMenuItem onSelect={() => setConfirmDelete(true)} variant="destructive">
                    Delete entirely
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      <p className={cn("mt-2 text-sm text-muted-foreground", item.isStruckThrough && "line-through")}>{item.description}</p>
      {item.actorName ? <p className="mt-2 text-xs text-muted-foreground">By {item.actorName}</p> : null}
      {error ? <p className="mt-2 text-sm text-[var(--urgent)]">{error}</p> : null}

      <Dialog onOpenChange={setConfirmDelete} open={confirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this entry entirely?</DialogTitle>
            <DialogDescription>This permanently removes the entry instead of striking it through. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={pending} onClick={() => setConfirmDelete(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={pending} onClick={() => runAction(deleteMatterEventAction)} type="button" variant="destructive">
              {pending ? "Deleting..." : "Delete Entirely"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
