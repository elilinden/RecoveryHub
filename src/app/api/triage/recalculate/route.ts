import { NextResponse, type NextRequest } from "next/server";

import { loadDashboardMatterSnapshots } from "@/lib/dashboard/data";
import { getCurrentProfile } from "@/lib/data/profiles";
import { evaluateMatterTriage } from "@/lib/triage/rules";
import { loadTriageSettings, syncMatterFlags } from "@/lib/triage/data";

export async function POST(request: NextRequest) {
  const secret = process.env.TRIAGE_RECALCULATION_SECRET;
  const provided = request.headers.get("x-triage-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, message: "Not authorized." }, { status: 401 });
  }

  const profile = await getCurrentProfile();
  if (!profile || !["admin", "partner"].includes(profile.role)) {
    return NextResponse.json({ ok: false, message: "A partner or administrator session is required." }, { status: 403 });
  }

  const { settings } = await loadTriageSettings(profile);
  const snapshots = await loadDashboardMatterSnapshots({ profile, mode: "firm" });
  const now = new Date();
  const evaluations = snapshots.map((snapshot) => evaluateMatterTriage(snapshot, settings, now));
  const result = await syncMatterFlags(evaluations, profile);

  return NextResponse.json({
    ok: result.ok,
    evaluatedMatterCount: evaluations.length,
    updatedFlagCount: result.updatedCount,
  });
}
