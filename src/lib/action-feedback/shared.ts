export const ACTION_FEEDBACK_COOKIE = "recovery_hub_action_feedback";

export type ActionFeedback = {
  id: string;
  tone: "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
};

export type ActionResultLike = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export function parseActionFeedbackCookie(value?: string | null): ActionFeedback | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<ActionFeedback>;
    if (!parsed.message || (parsed.tone !== "success" && parsed.tone !== "error")) return null;
    return {
      id: typeof parsed.id === "string" ? parsed.id : String(Date.now()),
      tone: parsed.tone,
      message: parsed.message,
      fieldErrors: parsed.fieldErrors,
    };
  } catch {
    return null;
  }
}
