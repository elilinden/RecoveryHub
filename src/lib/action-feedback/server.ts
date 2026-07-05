import "server-only";

import { cookies } from "next/headers";

import { ACTION_FEEDBACK_COOKIE, type ActionResultLike } from "@/lib/action-feedback/shared";

export async function setActionFeedback(result: ActionResultLike) {
  const message = result.message?.trim();
  if (!message) return;

  const feedback = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    tone: result.ok ? "success" as const : "error" as const,
    message,
    fieldErrors: result.fieldErrors,
  };

  const cookieStore = await cookies();
  cookieStore.set(ACTION_FEEDBACK_COOKIE, encodeURIComponent(JSON.stringify(feedback)), {
    maxAge: 60,
    path: "/",
    sameSite: "lax",
  });
}

export async function submitWithActionFeedback<T extends ActionResultLike>(
  action: (formData: FormData) => Promise<T>,
  formData: FormData
) {
  const result = await action(formData);
  await setActionFeedback(result);
  return result;
}
