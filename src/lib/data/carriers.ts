import { createClient } from "@/lib/supabase/server";

export async function listCarriers() {
  const supabase = await createClient();
  return supabase.from("carriers").select("*").order("name");
}
