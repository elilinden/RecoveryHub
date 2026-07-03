import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type IntakeDraftSummary = {
  id: string;
  matterName: string;
  carrierClaimNumber: string | null;
  carrierName: string;
  currentStep: number;
  status: "draft" | "in_progress";
  lastAutosavedAt: string | null;
};

const developmentDrafts: IntakeDraftSummary[] = [
  {
    id: "development-intake-draft",
    matterName: "Draft Intake: Rivergate Slip Loss",
    carrierClaimNumber: "SC-88420-26",
    carrierName: "Summit Casualty",
    currentStep: 2,
    status: "in_progress",
    lastAutosavedAt: "2026-07-03T13:45:00.000Z",
  },
];

export async function listIntakeDrafts(): Promise<IntakeDraftSummary[]> {
  if (!isSupabaseConfigured()) {
    return developmentDrafts;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("matters")
    .select("id,matter_name,carrier_claim_number,current_intake_step,intake_status,last_autosaved_at,carriers(name)")
    .in("intake_status", ["draft", "in_progress"])
    .eq("is_archived", false)
    .order("last_autosaved_at", { ascending: false })
    .limit(5);

  return (
    data?.map((matter) => ({
      id: String(matter.id),
      matterName: String(matter.matter_name),
      carrierClaimNumber: matter.carrier_claim_number ? String(matter.carrier_claim_number) : null,
      carrierName: Array.isArray(matter.carriers)
        ? String(matter.carriers[0]?.name ?? "Unknown carrier")
        : String((matter.carriers as { name?: unknown } | null)?.name ?? "Unknown carrier"),
      currentStep: Number(matter.current_intake_step ?? 1),
      status: matter.intake_status === "in_progress" ? "in_progress" : "draft",
      lastAutosavedAt: matter.last_autosaved_at ? String(matter.last_autosaved_at) : null,
    })) ?? []
  );
}
