import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type SavedViewRecord = {
  id: string;
  profile_id: string;
  name: string;
  page: string;
  filter_configuration: Json;
  is_shared: boolean;
};

export async function listMatterSavedViews(): Promise<SavedViewRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_views")
    .select("id,profile_id,name,page,filter_configuration,is_shared")
    .eq("page", "matters")
    .order("name");

  if (error) {
    return [];
  }

  return data as SavedViewRecord[];
}

export async function createPersonalMatterSavedView(input: {
  profileId: string;
  name: string;
  filterConfiguration: Json;
}) {
  const supabase = await createClient();
  return supabase.from("saved_views").insert({
    profile_id: input.profileId,
    name: input.name,
    page: "matters",
    filter_configuration: input.filterConfiguration,
    is_shared: false,
  });
}
