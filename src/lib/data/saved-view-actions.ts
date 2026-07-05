"use server";

import { revalidatePath } from "next/cache";

import { setActionFeedback } from "@/lib/action-feedback/server";
import { createPersonalMatterSavedView } from "@/lib/data/saved-views";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function saveCurrentMatterViewAction(formData: FormData) {
  const nameValue = formData.get("name");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";

  if (!name) {
    await setActionFeedback({ ok: false, message: "Enter a saved view name." });
    return;
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    await setActionFeedback({ ok: false, message: "Your session has expired. Please sign in again." });
    return;
  }

  await createPersonalMatterSavedView({
    profileId: profile.id,
    name,
    filterConfiguration: {
      source: "matters-page",
      filters: {
        page: "matters",
      },
    },
  });

  revalidatePath("/matters");
  await setActionFeedback({ ok: true, message: "Saved view created." });
}
