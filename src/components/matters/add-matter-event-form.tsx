"use client";

import { useActionState, useEffect, useRef } from "react";

import { SelectField, TextField } from "@/components/matters/matter-form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMatterEventAction } from "@/lib/matters-workspace/actions";
import type { WorkspaceActionResult } from "@/lib/matters-workspace/actions";

const initialState: WorkspaceActionResult = { ok: true, message: "" };

type AddMatterEventFormProps = {
  matterId: string;
};

export function AddMatterEventForm({ matterId }: AddMatterEventFormProps) {
  const [state, action, pending] = useActionState(addMatterEventAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const previousPending = useRef(pending);

  useEffect(() => {
    if (previousPending.current && !pending && state.ok) {
      formRef.current?.reset();
    }
    previousPending.current = pending;
  }, [pending, state]);

  return (
    <form action={action} className="grid gap-3 rounded-lg border border-border bg-background p-4 lg:grid-cols-[180px_140px_1fr_auto]" ref={formRef}>
      <input name="matterId" type="hidden" value={matterId} />
      <SelectField
        label="Event type"
        name="eventType"
        options={[
          ["document_requested", "Document requested"],
          ["document_received", "Document received"],
          ["demand_sent", "Demand sent"],
          ["response_received", "Response received"],
          ["offer_received", "Offer received"],
          ["recovery_received", "Recovery received"],
          ["other", "Other event"],
        ]}
        value="other"
      />
      <label className="space-y-1 text-sm font-medium text-foreground">
        <span>Time</span>
        <Input name="occurredTime" type="time" />
      </label>
      <TextField label="Description" name="description" value="" />
      <Button className="self-end" disabled={pending} type="submit">
        {pending ? "Adding..." : "Add Event"}
      </Button>
      <p className="text-xs text-muted-foreground lg:col-span-4">
        Defaults to right now. Mention a different date or time in the description if this happened earlier.
      </p>
      {!state.ok ? <p className="text-sm text-[var(--urgent)] lg:col-span-4">{state.message}</p> : null}
    </form>
  );
}
