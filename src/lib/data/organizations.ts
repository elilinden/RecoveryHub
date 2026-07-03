import { createClient } from "@/lib/supabase/server";

export async function listOrganizations() {
  const supabase = await createClient();
  return supabase.from("organizations").select("*").order("name");
}
