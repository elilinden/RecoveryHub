import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { matterDocumentBucket } from "@/lib/documents-packages/storage";
import { getDevelopmentDocumentById } from "@/lib/documents-packages/data";

export type SignedDocumentAccess =
  | { ok: true; url: string; expiresInSeconds: number }
  | { ok: false; message: string; status: number };

type DocumentAccessRow = {
  id: string;
  source_type: string;
  storage_path: string | null;
  external_url: string | null;
  status: string;
  scan_status: string;
};

export async function createSignedDocumentAccessUrl(documentId: string): Promise<SignedDocumentAccess> {
  if (!isSupabaseConfigured()) {
    const document = await getDevelopmentDocumentById(documentId);
    if (!document) return { ok: false, message: "Document not found.", status: 404 };
    if (document.status === "quarantined" || document.scanStatus === "flagged") {
      return { ok: false, message: "This document is quarantined and cannot be accessed.", status: 403 };
    }
    if (document.externalUrl) return { ok: true, url: document.externalUrl, expiresInSeconds: 300 };
    return { ok: true, url: `data:text/plain,Development%20download%20placeholder%20for%20${encodeURIComponent(document.displayFilename)}`, expiresInSeconds: 300 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matter_documents")
    .select("id, source_type, storage_path, external_url, status, scan_status")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Document not found.", status: 404 };

  const document = data as unknown as DocumentAccessRow;
  if (document.status === "quarantined" || document.status === "failed" || document.scan_status === "flagged") {
    return { ok: false, message: "This document cannot be accessed in its current status.", status: 403 };
  }
  if (document.source_type === "external_link") {
    if (!document.external_url) return { ok: false, message: "External document link is unavailable.", status: 404 };
    return { ok: true, url: document.external_url, expiresInSeconds: 300 };
  }
  if (!document.storage_path) return { ok: false, message: "Stored file is unavailable.", status: 404 };

  const { data: signed, error: signError } = await supabase.storage
    .from(matterDocumentBucket)
    .createSignedUrl(document.storage_path, 300);
  if (signError || !signed?.signedUrl) return { ok: false, message: "Signed document access failed.", status: 500 };
  return { ok: true, url: signed.signedUrl, expiresInSeconds: 300 };
}
