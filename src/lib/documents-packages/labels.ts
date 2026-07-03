import type {
  DocumentScanStatus,
  DocumentSourceType,
  DocumentStatus,
  DocumentTemplateType,
  DocumentVisibility,
  EmailSource,
  MatterDocumentType,
  OutboundPackageStatus,
  OutboundPackageType,
  PackageSort,
  PackageValidationSeverity,
  PackageValidationStatus,
  RecipientRole,
  TemplateVersionStatus,
  VerificationStatus,
} from "@/lib/documents-packages/types";

export const documentTypeLabels: Record<MatterDocumentType, string> = {
  demand_letter: "Demand letter",
  payment_ledger: "Payment ledger",
  proof_of_payment: "Proof of payment",
  police_or_incident_report: "Police or incident report",
  photograph: "Photograph",
  video: "Video",
  witness_statement: "Witness statement",
  repair_estimate: "Repair estimate",
  repair_invoice: "Repair invoice",
  medical_record: "Medical record",
  expert_report: "Expert report",
  insurance_information: "Insurance information",
  policy_document: "Policy document",
  correspondence: "Correspondence",
  pleading: "Pleading",
  discovery: "Discovery",
  arbitration_document: "Arbitration document",
  settlement_document: "Settlement document",
  legal_notice: "Legal notice",
  other: "Other",
};

export const sourceTypeLabels: Record<DocumentSourceType, string> = {
  uploaded: "Uploaded file",
  external_link: "External link",
  generated_from_template: "Generated from template",
  imported: "Imported",
  integration: "Integration",
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  uploading: "Uploading",
  processing: "Processing",
  available: "Available",
  quarantined: "Quarantined",
  failed: "Failed",
  superseded: "Superseded",
  archived: "Archived",
};

export const scanStatusLabels: Record<DocumentScanStatus, string> = {
  not_scanned: "Not scanned",
  pending: "Scan pending",
  clean: "Clean",
  flagged: "Flagged",
  scan_failed: "Scan failed",
};

export const visibilityLabels: Record<DocumentVisibility, string> = {
  internal_only: "Internal only",
  package_eligible: "Package eligible",
  client_eligible: "Client eligible",
  restricted: "Restricted",
};

export const templateTypeLabels: Record<DocumentTemplateType, string> = {
  subrogation_demand: "Subrogation demand",
  reimbursement_request: "Reimbursement request",
  document_request: "Document request",
  follow_up_demand: "Follow-up demand",
  deadline_notice: "Deadline notice",
  arbitration_notice: "Arbitration notice",
  litigation_notice: "Litigation notice",
  settlement_document: "Settlement document",
  other: "Other",
};

export const templateVersionStatusLabels: Record<TemplateVersionStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  retired: "Retired",
};

export const packageTypeLabels: Record<OutboundPackageType, string> = {
  initial_demand: "Initial demand",
  supplemental_demand: "Supplemental demand",
  reimbursement_request: "Reimbursement request",
  document_request: "Document request",
  follow_up: "Follow-up",
  arbitration_notice: "Arbitration notice",
  litigation_notice: "Litigation notice",
  settlement: "Settlement",
  other: "Other",
};

export const packageStatusLabels: Record<OutboundPackageStatus, string> = {
  draft: "Draft",
  assembling: "Assembling",
  validation_needed: "Validation needed",
  ready_for_review: "Ready for review",
  changes_requested: "Changes requested",
  approved_for_send: "Approved for send",
  canceled: "Canceled",
};

export const recipientRoleLabels: Record<RecipientRole, string> = {
  responsible_party: "Responsible party",
  adverse_adjuster: "Adverse adjuster",
  adverse_insurer: "Adverse insurer",
  claims_administrator: "Claims administrator",
  opposing_counsel: "Opposing counsel",
  carrier_contact: "Carrier contact",
  individual: "Individual",
  company: "Company",
  other: "Other",
};

export const emailSourceLabels: Record<EmailSource, string> = {
  existing_contact: "Existing contact",
  carrier_directory: "Carrier directory",
  prior_correspondence: "Prior correspondence",
  user_entered: "User entered",
  verified_external_source: "Verified external source",
  unknown: "Unknown",
};

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  verification_required: "Verification required",
  verified: "Verified",
  rejected: "Rejected",
  outdated: "Outdated",
};

export const validationStatusLabels: Record<PackageValidationStatus, string> = {
  passed: "Passed",
  warning: "Warning",
  failed: "Failed",
  overridden: "Overridden",
};

export const validationSeverityLabels: Record<PackageValidationSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  informational: "Informational",
};

export const packageSortLabels: Record<PackageSort, string> = {
  awaiting_review: "Oldest awaiting review",
  response_deadline: "Nearest response deadline",
  updated_desc: "Most recently updated",
  amount_demanded: "Amount demanded",
  carrier: "Carrier",
  package_type: "Package type",
};

export function labelFromEnum(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
