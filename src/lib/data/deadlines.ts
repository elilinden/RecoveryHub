import { createClient } from "@/lib/supabase/server";

export async function listMatterDeadlines(matterId: string) {
  const supabase = await createClient();
  return supabase.from("deadlines").select("*").eq("matter_id", matterId).order("deadline_date");
}
