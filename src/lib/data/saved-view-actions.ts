"use server";

import { revalidatePath } from "next/cache";

import { createPersonalMatterSavedView } from "@/lib/data/saved-views";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function saveCurrentMatterViewAction(formData: FormData) {
  const nameValue = formData.get("name");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";

  if (!name) {
    return;
  }

  const profile = await getCurrentProfile();

  if (!profile) {
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
}
