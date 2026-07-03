import { createClient } from "@/lib/supabase/server";

export async function listExternalReferences(entityType: string, entityId: string) {
  const supabase = await createClient();
  return supabase
    .from("external_references")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("system_name");
}
