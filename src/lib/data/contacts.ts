import { createClient } from "@/lib/supabase/server";

export async function listContacts() {
  const supabase = await createClient();
  return supabase.from("contacts").select("*").order("last_name");
}
