import { createClient } from "@/lib/supabase/server";

export async function listMatterTasks(matterId: string) {
  const supabase = await createClient();
  return supabase.from("tasks").select("*").eq("matter_id", matterId).order("due_date");
}
