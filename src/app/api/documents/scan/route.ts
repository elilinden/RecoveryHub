import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { matterDocumentBucket } from "@/lib/documents-packages/storage";
import { isScanningConfigured, scanFileForMalware } from "@/lib/documents-packages/scanning";
import type { DocumentScanStatus, DocumentStatus } from "@/lib/documents-packages/types";

const pendingScanStatuses: DocumentScanStatus[] = ["pending", "scan_failed"];
const batchLimit = 20;

type PendingDocumentRow = {
  id: string;
  matter_id: string;
  storage_path: string | null;
  mime_type: string | null;
  display_filename: string | null;
};

function statusForScanOutcome(scanOutcome: DocumentScanStatus): DocumentStatus {
  if (scanOutcome === "clean") return "available";
  if (scanOutcome === "flagged") return "quarantined";
  if (scanOutcome === "scan_failed") return "failed";
  return "processing";
}

/**
 * Scans documents left in scan_status "pending" or "scan_failed" after upload.
 * Intended to be called by a scheduler; see docs/document-scanning.md.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.DOCUMENT_SCAN_SECRET;
  const provided = request.headers.get("x-document-scan-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, message: "Not authorized." }, { status: 401 });
  }
  if (!isScanningConfigured()) {
    return NextResponse.json({ ok: false, message: "Malware scanning is not configured." }, { status: 503 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, message: "Supabase admin configuration is required to scan documents." }, { status: 500 });
  }

  const [{ data, error }, { count: totalPendingDocuments, error: countError }] = await Promise.all([
    admin
      .from("matter_documents")
      .select("id,matter_id,storage_path,mime_type,display_filename")
      .in("scan_status", pendingScanStatuses)
      .eq("source_type", "uploaded")
      .not("storage_path", "is", null)
      .order("created_at", { ascending: true })
      .limit(batchLimit),
    admin
      .from("matter_documents")
      .select("id", { count: "exact", head: true })
      .in("scan_status", pendingScanStatuses)
      .eq("source_type", "uploaded")
      .not("storage_path", "is", null),
  ]);

  if (error) {
    return NextResponse.json({ ok: false, message: "Could not load pending documents." }, { status: 500 });
  }
  if (countError) {
    console.error("document scan: could not count pending backlog", countError);
  }

  const candidates = (data ?? []) as unknown as PendingDocumentRow[];
  let scanned = 0;
  let flagged = 0;
  let stillPending = 0;

  for (const doc of candidates) {
    if (!doc.storage_path) continue;

    const { data: fileBlob, error: downloadError } = await admin.storage.from(matterDocumentBucket).download(doc.storage_path);
    if (downloadError || !fileBlob) {
      await admin.from("matter_documents").update({ scan_status: "scan_failed" satisfies DocumentScanStatus }).eq("id", doc.id);
      continue;
    }

    const bytes = await fileBlob.arrayBuffer();
    const outcome = await scanFileForMalware({
      bytes,
      filename: doc.display_filename ?? "document",
      mimeType: doc.mime_type ?? "application/octet-stream",
    });

    if (outcome === "pending") {
      stillPending += 1;
      continue;
    }

    await admin.from("matter_documents").update({ status: statusForScanOutcome(outcome), scan_status: outcome }).eq("id", doc.id);
    scanned += 1;

    if (outcome === "flagged") {
      flagged += 1;
      await admin.from("activity_logs").insert({
        matter_id: doc.matter_id,
        actor_id: null,
        action_type: "document_flagged",
        entity_type: "matter_document",
        entity_id: doc.id,
        description: "Scheduled malware scan flagged this document and quarantined it.",
        new_value: { scan_status: outcome },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    candidateCount: candidates.length,
    totalPendingDocuments: totalPendingDocuments ?? candidates.length,
    scanned,
    flagged,
    stillPending,
  });
}
