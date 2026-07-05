"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { closeMatterAction, reopenMatterAction, type WorkspaceActionResult } from "@/lib/matters-workspace/actions";

function ResultBanner({ result }: { result: WorkspaceActionResult | null }) {
  if (!result || result.ok) return null;
  return (
    <p className="rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]" role="alert">
      {result.message}
    </p>
  );
}

export function CloseMatterDialog({ matterId }: { matterId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<WorkspaceActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await closeMatterAction(formData);
      setResult(response);
      if (response.ok) {
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog onOpenChange={(next) => { if (next) setResult(null); setOpen(next); }} open={open}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start" size="sm" type="button" variant="ghost">
          Close Matter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close matter</DialogTitle>
          <DialogDescription>Record why this matter is being closed. This is added to the matter&apos;s timeline.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} ref={formRef}>
          <input name="matterId" type="hidden" value={matterId} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="close-reason">
              Reason for closing
            </label>
            <Input autoFocus id="close-reason" name="reason" placeholder="e.g. Settled, claim denied, client withdrew" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="close-date">
              Closing date
            </label>
            <Input defaultValue={new Date().toISOString().slice(0, 10)} id="close-date" name="closingDate" required type="date" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="close-note">
              Additional notes <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              className="min-h-20 w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="close-note"
              name="note"
              rows={3}
            />
          </div>
          <ResultBanner result={result} />
          <DialogFooter>
            <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Closing..." : "Close Matter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReopenMatterDialog({
  defaultResponsibleUser,
  matterId,
}: {
  defaultResponsibleUser: string;
  matterId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<WorkspaceActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await reopenMatterAction(formData);
      setResult(response);
      if (response.ok) {
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog onOpenChange={(next) => { if (next) setResult(null); setOpen(next); }} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Reopen Matter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reopen matter</DialogTitle>
          <DialogDescription>Record why this matter is being reopened. This is added to the matter&apos;s timeline.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} ref={formRef}>
          <input name="matterId" type="hidden" value={matterId} />
          <input name="stage" type="hidden" value="investigation" />
          <input name="responsibleUser" type="hidden" value={defaultResponsibleUser} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="reopen-reason">
              Reason for reopening
            </label>
            <Input autoFocus id="reopen-reason" name="reason" placeholder="e.g. Carrier reopened the claim, new evidence found" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="reopen-next-action">
              Next action
            </label>
            <Input defaultValue="Review reopened matter" id="reopen-next-action" name="nextAction" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="reopen-next-action-date">
              Next action due date
            </label>
            <Input defaultValue={new Date().toISOString().slice(0, 10)} id="reopen-next-action-date" name="nextActionDueDate" required type="date" />
          </div>
          <ResultBanner result={result} />
          <DialogFooter>
            <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Reopening..." : "Reopen Matter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
