import { createClient } from "@/lib/supabase/server";

export async function listMatterActivityLogs(matterId: string) {
  const supabase = await createClient();
  return supabase.from("activity_logs").select("*").eq("matter_id", matterId).order("created_at", { ascending: false });
}
