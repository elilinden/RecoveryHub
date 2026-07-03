import { createClient } from "@/lib/supabase/server";

export async function listEvidenceItems(matterId: string) {
  const supabase = await createClient();
  return supabase.from("evidence_items").select("*").eq("matter_id", matterId).order("created_at");
}
