import { createClient } from "@/lib/supabase/server";

export async function listPermittedMatters() {
  const supabase = await createClient();
  return supabase
    .from("matters")
    .select("id,matter_name,carrier_claim_number,amount_sought,stage,priority,next_action,next_action_due_date,statute_deadline,statute_deadline_verified,last_substantive_activity_at")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
}

export async function getPermittedMatter(id: string) {
  const supabase = await createClient();
  return supabase.from("matters").select("*").eq("id", id).maybeSingle();
}
