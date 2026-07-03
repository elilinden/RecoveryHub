"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { DateField, SelectField, TextField } from "@/components/matters/matter-form-fields";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { submitUpdateCurrentStatusAction } from "@/lib/matters-workspace/actions";

type EditCurrentStatusSheetProps = {
  matterId: string;
  currentStatusSummary: string | null;
  stage: string;
  priority: string;
  nextAction: string | null;
  nextActionDueDate: string | null;
  stageOptions: Array<[string, string]>;
  priorityOptions: Array<[string, string]>;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
};

export function EditCurrentStatusSheet({
  matterId,
  currentStatusSummary,
  stage,
  priority,
  nextAction,
  nextActionDueDate,
  stageOptions,
  priorityOptions,
  triggerLabel = "Edit Status",
  triggerVariant = "outline",
}: EditCurrentStatusSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button className="h-10 gap-2" variant={triggerVariant}>
          <Pencil aria-hidden="true" className="size-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Update current status</SheetTitle>
          <SheetDescription>Update the stage, priority, and next action for this matter.</SheetDescription>
        </SheetHeader>
        <form
          action={submitUpdateCurrentStatusAction}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          onSubmit={() => setOpen(false)}
        >
          <input name="matterId" type="hidden" value={matterId} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>Status summary</span>
            <textarea
              className="min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              defaultValue={currentStatusSummary ?? ""}
              name="currentStatusSummary"
              placeholder="What is happening on this matter right now?"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Stage" name="stage" options={stageOptions} value={stage} />
            <SelectField label="Priority" name="priority" options={priorityOptions} value={priority} />
            <TextField label="Next action" name="nextAction" value={nextAction ?? ""} />
            <DateField label="Next-action due" name="nextActionDueDate" value={nextActionDueDate ?? ""} />
          </div>
          <SheetFooter className="mt-auto flex-row justify-end gap-2 px-0">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
