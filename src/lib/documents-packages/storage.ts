import { randomUUID, createHash } from "node:crypto";

import type { DocumentScanStatus, DocumentStatus, DocumentVisibility, MatterDocumentType } from "@/lib/documents-packages/types";

export const matterDocumentBucket = "matter-documents";
export const maxDocumentFileSizeBytes = 25 * 1024 * 1024;

export const supportedMimeTypes = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export type SupportedMimeType = keyof typeof supportedMimeTypes;

export type FileMetadataInput = {
  name: string;
  type: string;
  size: number;
  bytes?: ArrayBuffer;
};

export type FileMetadataResult =
  | {
      ok: true;
      mimeType: SupportedMimeType;
      fileExtension: string;
      safeDisplayFilename: string;
      fileHash: string | null;
    }
  | { ok: false; message: string };

export function validateDocumentFileMetadata(file: FileMetadataInput): FileMetadataResult {
  if (file.size <= 0) return { ok: false, message: "Select a non-empty file." };
  if (file.size > maxDocumentFileSizeBytes) return { ok: false, message: "The file is larger than the 25 MB limit." };
  if (!isSupportedMimeType(file.type)) {
    return { ok: false, message: "Supported file types are PDF, DOCX, XLSX, JPG, JPEG, and PNG." };
  }

  return {
    ok: true,
    mimeType: file.type,
    fileExtension: supportedMimeTypes[file.type],
    safeDisplayFilename: sanitizeDisplayFilename(file.name, supportedMimeTypes[file.type]),
    fileHash: file.bytes ? createHash("sha256").update(Buffer.from(file.bytes)).digest("hex") : null,
  };
}

export function isSupportedMimeType(value: string): value is SupportedMimeType {
  return Object.prototype.hasOwnProperty.call(supportedMimeTypes, value);
}

export function sanitizeDisplayFilename(filename: string, fallbackExtension = "bin") {
  const base = filename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const candidate = base || `document.${fallbackExtension}`;
  return candidate.includes(".") ? candidate : `${candidate}.${fallbackExtension}`;
}

/**
 * Storage path enforcement lives in the matter_document_objects_insert_authorized RLS
 * policy (supabase/migrations/202607040001_document_quarantine_enforcement.sql), which
 * requires uploads to land under <matter-id>/<document-id>/<filename> for a matter the
 * uploader can access. documentId must be the matter_documents row's own id so the two
 * stay in sync.
 */
export function createStoragePath(input: { matterId: string; documentId: string; filename: string }) {
  return `${input.matterId}/${input.documentId}/${input.filename}`;
}

export function createDocumentId() {
  return randomUUID();
}

export function canPreviewDocument(input: { mimeType: string | null; status: DocumentStatus; scanStatus: DocumentScanStatus }) {
  if (input.status === "quarantined" || input.status === "failed" || input.status === "archived") return false;
  if (input.scanStatus === "flagged") return false;
  return input.mimeType === "application/pdf" || input.mimeType === "image/jpeg" || input.mimeType === "image/png";
}

export function canSelectDocumentForPackage(input: {
  status: DocumentStatus;
  scanStatus: DocumentScanStatus;
  visibility: DocumentVisibility;
  canUseRestrictedDocuments: boolean;
}) {
  if (input.status !== "available") return false;
  if (input.scanStatus === "flagged" || input.scanStatus === "scan_failed") return false;
  if (input.visibility === "restricted" && !input.canUseRestrictedDocuments) return false;
  return true;
}

export const packageEligibleDocumentTypes: MatterDocumentType[] = [
  "demand_letter",
  "payment_ledger",
  "proof_of_payment",
  "police_or_incident_report",
  "photograph",
  "witness_statement",
  "repair_estimate",
  "repair_invoice",
  "medical_record",
  "expert_report",
  "insurance_information",
  "policy_document",
  "legal_notice",
  "other",
];
