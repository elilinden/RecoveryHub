"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requestPackageChangesAction, type DocumentPackageActionResult } from "@/lib/documents-packages/actions";

export function RequestPackageChangesDialog({ packageId }: { packageId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<DocumentPackageActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await requestPackageChangesAction(formData);
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
        <Button size="sm" type="button" variant="outline">
          Request Changes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request changes</DialogTitle>
          <DialogDescription>Explain what needs to be fixed before this package can be resubmitted.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} ref={formRef}>
          <input name="packageId" type="hidden" value={packageId} />
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="request-changes-comments">
              What needs to change?
            </label>
            <textarea
              autoFocus
              className="min-h-24 w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="request-changes-comments"
              name="comments"
              placeholder="e.g. Missing the signed release form, amount demanded doesn't match the ledger"
              required
              rows={4}
            />
          </div>
          {result && !result.ok ? (
            <p className="rounded-lg border border-[color:var(--urgent)]/20 bg-[var(--urgent-muted)] px-3 py-2 text-sm text-[var(--urgent)]" role="alert">
              {result.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={pending} onClick={() => setOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Sending..." : "Request Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
