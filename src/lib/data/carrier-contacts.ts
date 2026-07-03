import { createClient } from "@/lib/supabase/server";

export async function listCarrierContacts(carrierId?: string) {
  const supabase = await createClient();
  let query = supabase.from("carrier_contacts").select("*").order("full_name");

  if (carrierId) {
    query = query.eq("carrier_id", carrierId);
  }

  return query;
}
