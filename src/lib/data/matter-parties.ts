import { createClient } from "@/lib/supabase/server";

export async function listMatterParties(matterId: string) {
  const supabase = await createClient();
  return supabase.from("matter_parties").select("*").eq("matter_id", matterId);
}
