import "server-only";

import type { DocumentScanStatus } from "@/lib/documents-packages/types";

export type ScanOutcome = Extract<DocumentScanStatus, "pending" | "clean" | "flagged" | "scan_failed">;

export function isScanningConfigured() {
  return Boolean(process.env.VIRUSTOTAL_API_KEY);
}

/**
 * Submits a file to VirusTotal for malware analysis and polls for the result.
 *
 * Without VIRUSTOTAL_API_KEY configured, this deliberately returns "pending"
 * rather than pretending to have scanned the file — documents stay
 * unavailable (see can_download_document in
 * supabase/migrations/202607040001_document_quarantine_enforcement.sql) until
 * a real scan resolves them. See docs/document-scanning.md for setup.
 */
export async function scanFileForMalware(input: { bytes: ArrayBuffer; filename: string; mimeType: string }): Promise<ScanOutcome> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    return "pending";
  }

  try {
    const uploadForm = new FormData();
    uploadForm.append("file", new Blob([input.bytes], { type: input.mimeType }), input.filename);

    const uploadResponse = await fetch("https://www.virustotal.com/api/v3/files", {
      method: "POST",
      headers: { "x-apikey": apiKey },
      body: uploadForm,
    });
    if (!uploadResponse.ok) return "scan_failed";

    const uploadData: { data?: { id?: string } } = await uploadResponse.json();
    const analysisId = uploadData.data?.id;
    if (!analysisId) return "scan_failed";

    const maxAttempts = 6;
    const pollDelayMs = 2000;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, pollDelayMs));

      const analysisResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { "x-apikey": apiKey },
      });
      if (!analysisResponse.ok) continue;

      const analysisData: {
        data?: { attributes?: { status?: string; stats?: { malicious?: number; suspicious?: number } } };
      } = await analysisResponse.json();
      const attributes = analysisData.data?.attributes;
      if (attributes?.status !== "completed") continue;

      const malicious = (attributes.stats?.malicious ?? 0) + (attributes.stats?.suspicious ?? 0);
      return malicious > 0 ? "flagged" : "clean";
    }

    return "pending";
  } catch {
    return "scan_failed";
  }
}
