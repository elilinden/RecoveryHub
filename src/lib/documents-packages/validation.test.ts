import { describe, expect, it } from "vitest";

import { canApprovePackageForSend, getPackageApprovalBlockers, hasBlockingValidation, resetVerificationOnEmailChange, validateOutboundPackage } from "@/lib/documents-packages/validation";
import type { MatterDetail } from "@/lib/matters-workspace/types";
import type { OutboundPackage } from "@/lib/documents-packages/types";

const matter = {
  id: "matter-1",
  stage: "ready_for_demand",
  carrierClaimNumber: "CLM-100",
  primaryPartyNames: ["Taylor Reed"],
  amountSought: 12000,
  statuteDeadline: "2027-01-01",
  statuteDeadlineVerified: true,
} as Pick<MatterDetail, "id" | "stage" | "carrierClaimNumber" | "primaryPartyNames" | "amountSought" | "statuteDeadline" | "statuteDeadlineVerified">;

function packageFixture(overrides: Partial<OutboundPackage> = {}): OutboundPackage {
  return {
    id: "package-1",
    matterId: "matter-1",
    matterName: "Matter",
    carrierName: "Carrier",
    packageType: "initial_demand",
    status: "ready_for_review",
    title: "Demand package",
    subjectLine: "Demand",
    coverDocumentId: "doc-cover",
    templateVersionId: "template-v1",
    amountDemanded: 12000,
    responseDeadline: "2026-08-01",
    paymentInstructions: "Send payment to the firm trust account instructions on file.",
    claimNumberSnapshot: "CLM-100",
    insuredNameSnapshot: "Taylor Reed",
    responsiblePartySnapshot: "Jordan Collins",
    carrierNameSnapshot: "Carrier",
    matterAmountSoughtSnapshot: 12000,
    notes: null,
    assignedToName: "Nora Chen",
    createdByName: "Nora Chen",
    submittedForReviewAt: "2026-07-03T12:00:00.000Z",
    approvedByName: null,
    approvedAt: null,
    canceledAt: null,
    createdAt: "2026-07-03T12:00:00.000Z",
    updatedAt: "2026-07-03T12:00:00.000Z",
    recipients: [
      {
        id: "recipient-1",
        recipientNameSnapshot: "Claims Desk",
        organizationNameSnapshot: "Example Claims",
        emailAddress: "claims@example.com",
        emailSource: "user_entered",
        recipientRole: "claims_administrator",
        relationshipToMatter: "Adverse claims administrator",
        verificationStatus: "verified",
        verifiedByName: "Eli Linden",
        verifiedAt: "2026-07-03T12:00:00.000Z",
        verificationNote: "Verified against fictional directory.",
        isPrimary: true,
      },
    ],
    documents: [
      {
        id: "package-doc-1",
        documentId: "doc-cover",
        title: "Demand letter",
        documentVersionNumberSnapshot: 1,
        displayFilenameSnapshot: "Demand.pdf",
        documentTypeSnapshot: "demand_letter",
        scanStatus: "not_scanned",
        visibility: "package_eligible",
        status: "available",
        sortOrder: 1,
        isRequired: true,
      },
      {
        id: "package-doc-2",
        documentId: "doc-ledger",
        title: "Payment ledger",
        documentVersionNumberSnapshot: 1,
        displayFilenameSnapshot: "Ledger.pdf",
        documentTypeSnapshot: "payment_ledger",
        scanStatus: "not_scanned",
        visibility: "package_eligible",
        status: "available",
        sortOrder: 2,
        isRequired: true,
      },
    ],
    validations: [],
    reviews: [],
    ...overrides,
  };
}

describe("package validation", () => {
  it("passes a complete package without critical blockers", () => {
    const validations = validateOutboundPackage({ matter, outboundPackage: packageFixture(), now: new Date("2026-07-03T12:00:00.000Z") });
    expect(hasBlockingValidation(validations)).toBe(false);
  });

  it("blocks approval when recipient email is unverified or attachments are quarantined", () => {
    const pkg = packageFixture({
      recipients: [{ ...packageFixture().recipients[0], verificationStatus: "unverified", verifiedByName: null, verifiedAt: null }],
      documents: [{ ...packageFixture().documents[0], status: "quarantined", scanStatus: "flagged" }],
    });
    const validations = validateOutboundPackage({ matter, outboundPackage: pkg, now: new Date("2026-07-03T12:00:00.000Z") });
    expect(validations.find((validation) => validation.validationKey === "recipient_email_verified")?.status).toBe("failed");
    expect(validations.find((validation) => validation.validationKey === "no_blocked_attachments")?.status).toBe("failed");
    expect(hasBlockingValidation(validations)).toBe(true);
  });

  it("blocks approved-for-send eligibility when required package integrity is missing", () => {
    const pkg = packageFixture({
      coverDocumentId: null,
      recipients: [],
      documents: [],
      validations: [
        {
          id: "validation-critical",
          validationKey: "cover_document_exists",
          status: "failed",
          severity: "critical",
          title: "Cover document exists",
          description: "Generate or attach the package cover document.",
          overrideReason: null,
          resolvedAt: null,
        },
      ],
    });

    expect(canApprovePackageForSend(pkg)).toBe(false);
    expect(getPackageApprovalBlockers(pkg)).toEqual(expect.arrayContaining([
      "Add a package recipient.",
      "Add all required available attachments.",
      "Generate or attach the required cover document.",
      "Resolve critical validation failures.",
    ]));
  });

  it("allows approval eligibility for a ready package with verified recipient and required documents", () => {
    expect(canApprovePackageForSend(packageFixture())).toBe(true);
  });

  it("resets verification when an email changes", () => {
    expect(resetVerificationOnEmailChange("old@example.com", "new@example.com", "verified")).toBe("verification_required");
    expect(resetVerificationOnEmailChange("same@example.com", "same@example.com", "verified")).toBe("verified");
  });
});
