import { describe, expect, it } from "vitest";

import {
  canPreviewDocument,
  canSelectDocumentForPackage,
  createStoragePath,
  maxDocumentFileSizeBytes,
  validateDocumentFileMetadata,
} from "@/lib/documents-packages/storage";

describe("document storage helpers", () => {
  it("accepts supported private document metadata", () => {
    const result = validateDocumentFileMetadata({
      name: "Payment Ledger.pdf",
      type: "application/pdf",
      size: 1024,
      bytes: new TextEncoder().encode("fictional").buffer,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fileExtension).toBe("pdf");
      expect(result.safeDisplayFilename).toBe("Payment Ledger.pdf");
      expect(result.fileHash).toHaveLength(64);
    }
  });

  it("rejects unsupported and oversized files", () => {
    expect(validateDocumentFileMetadata({ name: "script.html", type: "text/html", size: 100 }).ok).toBe(false);
    expect(validateDocumentFileMetadata({ name: "large.pdf", type: "application/pdf", size: maxDocumentFileSizeBytes + 1 }).ok).toBe(false);
  });

  it("creates matter- and document-scoped storage paths", () => {
    const path = createStoragePath({ matterId: "matter-1", documentId: "doc-1", filename: "Payment Ledger.pdf" });
    expect(path).toBe("matter-1/doc-1/Payment Ledger.pdf");
  });

  it("blocks flagged or restricted package selection", () => {
    expect(canSelectDocumentForPackage({ status: "available", scanStatus: "not_scanned", visibility: "package_eligible", canUseRestrictedDocuments: false })).toBe(true);
    expect(canSelectDocumentForPackage({ status: "quarantined", scanStatus: "flagged", visibility: "package_eligible", canUseRestrictedDocuments: true })).toBe(false);
    expect(canSelectDocumentForPackage({ status: "available", scanStatus: "not_scanned", visibility: "restricted", canUseRestrictedDocuments: false })).toBe(false);
  });

  it("allows preview only for safe preview types and non-flagged files", () => {
    expect(canPreviewDocument({ mimeType: "application/pdf", status: "available", scanStatus: "not_scanned" })).toBe(true);
    expect(canPreviewDocument({ mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", status: "available", scanStatus: "not_scanned" })).toBe(false);
    expect(canPreviewDocument({ mimeType: "image/png", status: "quarantined", scanStatus: "flagged" })).toBe(false);
  });
});
