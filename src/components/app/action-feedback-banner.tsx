"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ACTION_FEEDBACK_COOKIE, type ActionFeedback } from "@/lib/action-feedback/shared";
import { cn } from "@/lib/utils";

export function ActionFeedbackBanner({ feedback }: { feedback: ActionFeedback }) {
  const [visible, setVisible] = useState(true);
  const fieldErrors = feedback.fieldErrors ? Object.values(feedback.fieldErrors).filter(Boolean) : [];

  useEffect(() => {
    document.cookie = `${ACTION_FEEDBACK_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, [feedback.id]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "mb-4 rounded-lg border px-4 py-3 text-sm shadow-sm",
        feedback.tone === "error"
          ? "border-[color:var(--urgent-border)] bg-[var(--urgent-muted)] text-[var(--urgent)]"
          : "border-[color:var(--success-border)] bg-[var(--success-muted)] text-[var(--success)]"
      )}
      role={feedback.tone === "error" ? "alert" : "status"}
    >
      <div className="flex items-start gap-3">
        {feedback.tone === "error" ? (
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{feedback.message}</p>
          {fieldErrors.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {fieldErrors.slice(0, 4).map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button
          aria-label="Dismiss message"
          className="-mr-2 -mt-1 text-current hover:bg-background/50"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={() => setVisible(false)}
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}
