import { createClient } from "@/lib/supabase/server";

export async function listMatterEvents(matterId: string) {
  const supabase = await createClient();
  return supabase.from("matter_events").select("*").eq("matter_id", matterId).order("occurred_at", { ascending: false });
}
