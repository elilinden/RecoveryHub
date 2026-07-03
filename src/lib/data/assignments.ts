import { createClient } from "@/lib/supabase/server";

export async function listMatterAssignments(matterId: string) {
  const supabase = await createClient();
  return supabase.from("matter_assignments").select("*").eq("matter_id", matterId);
}
