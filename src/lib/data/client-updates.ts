import { createClient } from "@/lib/supabase/server";

export async function listInternalClientUpdates(matterId: string) {
  const supabase = await createClient();
  return supabase.from("client_updates").select("*").eq("matter_id", matterId).order("created_at", { ascending: false });
}
