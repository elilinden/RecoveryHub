import type { MatterDetail } from "@/lib/matters-workspace/types";
import type { OutboundPackage, PackageReview, PackageValidation, VerificationStatus } from "@/lib/documents-packages/types";

export type PackageValidationInput = {
  matter: Pick<MatterDetail, "id" | "stage" | "carrierClaimNumber" | "primaryPartyNames" | "amountSought" | "statuteDeadline" | "statuteDeadlineVerified">;
  outboundPackage: Pick<
    OutboundPackage,
    | "matterId"
    | "amountDemanded"
    | "responseDeadline"
    | "paymentInstructions"
    | "coverDocumentId"
    | "templateVersionId"
    | "documents"
    | "recipients"
  >;
  now?: Date;
};

type ValidationDraft = Omit<PackageValidation, "id" | "resolvedAt" | "overrideReason">;

export function validateOutboundPackage(input: PackageValidationInput): PackageValidation[] {
  const now = input.now ?? new Date();
  const validations: ValidationDraft[] = [];
  const pkg = input.outboundPackage;
  const matter = input.matter;
  const primaryRecipient = pkg.recipients.find((recipient) => recipient.isPrimary) ?? pkg.recipients[0];

  validations.push(makeValidation("matter_match", pkg.matterId === matter.id, "critical", "Correct matter", "Package belongs to the selected matter."));
  validations.push(makeValidation("claim_number_present", Boolean(matter.carrierClaimNumber), "high", "Claim number present", "Carrier claim number is required before approval."));
  validations.push(makeValidation("matter_active", matter.stage !== "closed", "high", "Matter is active", "Closed matters require an authorized exception before package approval."));
  validations.push(makeValidation("insured_present", matter.primaryPartyNames.length > 0, "medium", "Insured or primary party present", "A primary party should be recorded for the package snapshot."));

  validations.push(makeValidation("recipient_present", Boolean(primaryRecipient), "critical", "Recipient selected", "A package must include an intended primary recipient."));
  validations.push(makeValidation("recipient_relationship", Boolean(primaryRecipient?.relationshipToMatter), "high", "Recipient relationship documented", "Recipient relationship to the matter must be recorded."));
  validations.push(makeValidation("recipient_email_present", Boolean(primaryRecipient?.emailAddress), "critical", "Recipient email present", "Recipient email must be recorded before review."));
  validations.push(makeValidation("recipient_email_format", isEmail(primaryRecipient?.emailAddress ?? ""), "critical", "Recipient email format", "Recipient email must use a valid email format."));
  validations.push(makeValidation("recipient_email_verified", primaryRecipient?.verificationStatus === "verified", "critical", "Recipient email manually verified", "A permitted user must manually verify the recipient email."));

  validations.push(makeValidation("amount_present", pkg.amountDemanded !== null, "critical", "Amount demanded present", "Amount demanded is required for demand packages."));
  validations.push(makeValidation("amount_nonnegative", (pkg.amountDemanded ?? -1) >= 0, "critical", "Amount is nonnegative", "Amount demanded cannot be negative."));
  validations.push(makeValidation("amount_compared", pkg.amountDemanded === null || Math.abs(pkg.amountDemanded - matter.amountSought) <= Math.max(1000, matter.amountSought * 0.2), "medium", "Amount compared with matter", "Material amount differences should be explained before approval."));
  validations.push(makeValidation("payment_instructions", Boolean(pkg.paymentInstructions?.trim()), "high", "Payment instructions present", "Payment instructions are required for ordinary demand packages."));

  validations.push(makeValidation("response_deadline_present", Boolean(pkg.responseDeadline), "high", "Response deadline present", "A response deadline should be recorded."));
  validations.push(makeValidation("response_deadline_future", isFutureOrToday(pkg.responseDeadline, now), "high", "Response deadline is not past", "Response deadline should not be in the past."));
  validations.push(makeValidation("statute_deadline_verified", !matter.statuteDeadline || matter.statuteDeadlineVerified, "medium", "Legal deadline verified", "Unverified legal deadlines must be reviewed before sending."));

  validations.push(makeValidation("cover_document_exists", Boolean(pkg.coverDocumentId), "critical", "Cover document exists", "Generate or attach the package cover document."));
  validations.push(makeValidation("approved_template_recorded", Boolean(pkg.templateVersionId), "critical", "Approved template recorded", "The package must preserve the approved template version used."));

  const selectedDocumentIds = new Set<string>();
  const duplicates = pkg.documents.some((document) => {
    if (selectedDocumentIds.has(document.documentId)) return true;
    selectedDocumentIds.add(document.documentId);
    return false;
  });
  const hasPaymentProof = pkg.documents.some((document) => ["proof_of_payment", "payment_ledger"].includes(document.documentTypeSnapshot));
  const blockedDocument = pkg.documents.find((document) => document.status !== "available" || document.scanStatus === "flagged" || document.scanStatus === "scan_failed");
  const restrictedDocument = pkg.documents.find((document) => document.visibility === "restricted");

  validations.push(makeValidation("attachments_present", pkg.documents.length > 0, "critical", "Attachments selected", "At least one supporting document should be selected."));
  validations.push(makeValidation("no_duplicate_attachments", !duplicates, "medium", "No duplicate attachments", "Duplicate attachments require confirmation and a reason."));
  validations.push(makeValidation("payment_proof_included", hasPaymentProof, "high", "Payment proof included", "Ordinary demand packages should include proof of payment or a payment ledger."));
  validations.push(makeValidation("no_blocked_attachments", !blockedDocument, "critical", "Attachments are accessible", "Quarantined, failed, archived, or scan-failed documents cannot be approved."));
  validations.push(makeValidation("restricted_document_authorized", !restrictedDocument, "high", "Restricted documents authorized", "Restricted attachments require attorney authorization."));

  return validations.map((validation, index) => ({
    ...validation,
    id: `validation-${index + 1}-${validation.validationKey}`,
    resolvedAt: null,
    overrideReason: null,
  }));
}

export function hasBlockingValidation(validations: PackageValidation[]) {
  return validations.some((validation) => validation.status === "failed" && validation.severity === "critical");
}

export function getPackageApprovalBlockers(
  outboundPackage: Pick<OutboundPackage, "coverDocumentId" | "documents" | "recipients" | "reviews" | "status" | "validations">
) {
  const blockers: string[] = [];
  const primaryRecipient = outboundPackage.recipients.find((recipient) => recipient.isPrimary) ?? outboundPackage.recipients[0];
  const hasRequiredAttachment = outboundPackage.documents.some((document) => document.isRequired);
  const hasBlockedAttachment = outboundPackage.documents.some((document) => document.status !== "available" || document.scanStatus === "flagged" || document.scanStatus === "scan_failed");
  const criticalValidationFailure = outboundPackage.validations.some((validation) => validation.status === "failed" && validation.severity === "critical");
  const latestAttorneyReview = latestReview(outboundPackage.reviews, "attorney_review");

  if (!primaryRecipient) blockers.push("Add a package recipient.");
  if (primaryRecipient && primaryRecipient.verificationStatus !== "verified") blockers.push("Verify the recipient email.");
  if (!hasRequiredAttachment || hasBlockedAttachment) blockers.push("Add all required available attachments.");
  if (!outboundPackage.coverDocumentId) blockers.push("Generate or attach the required cover document.");
  if (criticalValidationFailure) blockers.push("Resolve critical validation failures.");
  if (outboundPackage.status !== "ready_for_review") blockers.push("Submit the package for attorney review.");
  if (latestAttorneyReview?.decision === "changes_requested" || latestAttorneyReview?.decision === "rejected") blockers.push("Complete the required attorney review.");

  return blockers;
}

export function canApprovePackageForSend(outboundPackage: Pick<OutboundPackage, "coverDocumentId" | "documents" | "recipients" | "reviews" | "status" | "validations">) {
  return getPackageApprovalBlockers(outboundPackage).length === 0;
}

export function resetVerificationOnEmailChange(previousEmail: string | null, nextEmail: string | null, currentStatus: VerificationStatus): VerificationStatus {
  if ((previousEmail ?? "").trim().toLowerCase() === (nextEmail ?? "").trim().toLowerCase()) return currentStatus;
  return nextEmail ? "verification_required" : "unverified";
}

function latestReview(reviews: PackageReview[], type: PackageReview["reviewType"]) {
  return [...reviews].filter((review) => review.reviewType === type).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function makeValidation(
  key: string,
  passed: boolean,
  severity: PackageValidation["severity"],
  title: string,
  description: string
): ValidationDraft {
  return {
    validationKey: key,
    status: passed ? "passed" : severity === "informational" ? "warning" : "failed",
    severity,
    title,
    description,
  };
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isFutureOrToday(value: string | null, now: Date) {
  if (!value) return false;
  const deadline = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(deadline.getTime())) return false;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return deadline >= today;
}
