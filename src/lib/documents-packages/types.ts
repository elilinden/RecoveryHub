import type { MatterType, ProfileRole } from "@/lib/matters-workspace/types";

export type MatterDocumentType =
  | "demand_letter"
  | "payment_ledger"
  | "proof_of_payment"
  | "police_or_incident_report"
  | "photograph"
  | "video"
  | "witness_statement"
  | "repair_estimate"
  | "repair_invoice"
  | "medical_record"
  | "expert_report"
  | "insurance_information"
  | "policy_document"
  | "correspondence"
  | "pleading"
  | "discovery"
  | "arbitration_document"
  | "settlement_document"
  | "legal_notice"
  | "other";

export type DocumentSourceType = "uploaded" | "external_link" | "generated_from_template" | "imported" | "integration";
export type DocumentStatus = "uploading" | "processing" | "available" | "quarantined" | "failed" | "superseded" | "archived";
export type DocumentScanStatus = "not_scanned" | "pending" | "clean" | "flagged" | "scan_failed";
export type DocumentVisibility = "internal_only" | "package_eligible" | "client_eligible" | "restricted";
export type DocumentTemplateType =
  | "subrogation_demand"
  | "reimbursement_request"
  | "document_request"
  | "follow_up_demand"
  | "deadline_notice"
  | "arbitration_notice"
  | "litigation_notice"
  | "settlement_document"
  | "other";
export type TemplateVersionStatus = "draft" | "approved" | "retired";
export type OutboundPackageType =
  | "initial_demand"
  | "supplemental_demand"
  | "reimbursement_request"
  | "document_request"
  | "follow_up"
  | "arbitration_notice"
  | "litigation_notice"
  | "settlement"
  | "other";
export type OutboundPackageStatus = "draft" | "assembling" | "validation_needed" | "ready_for_review" | "changes_requested" | "approved_for_send" | "canceled";
export type RecipientRole = "responsible_party" | "adverse_adjuster" | "adverse_insurer" | "claims_administrator" | "opposing_counsel" | "carrier_contact" | "individual" | "company" | "other";
export type EmailSource = "existing_contact" | "carrier_directory" | "prior_correspondence" | "user_entered" | "verified_external_source" | "unknown";
export type VerificationStatus = "unverified" | "verification_required" | "verified" | "rejected" | "outdated";
export type PackageValidationStatus = "passed" | "warning" | "failed" | "overridden";
export type PackageValidationSeverity = "critical" | "high" | "medium" | "low" | "informational";
export type PackageReviewType = "preparation_review" | "attorney_review";
export type PackageReviewDecision = "approved" | "changes_requested" | "rejected";

export type MatterDocument = {
  id: string;
  matterId: string;
  title: string;
  documentType: MatterDocumentType;
  description: string | null;
  documentDate: string | null;
  sourceType: DocumentSourceType;
  sourceLabel: string;
  storageProvider: string;
  storagePath: string | null;
  externalUrl: string | null;
  originalFilename: string | null;
  displayFilename: string;
  mimeType: string | null;
  fileExtension: string | null;
  fileSizeBytes: number | null;
  fileHash: string | null;
  pageCount: number | null;
  status: DocumentStatus;
  scanStatus: DocumentScanStatus;
  visibility: DocumentVisibility;
  versionGroupId: string;
  versionNumber: number;
  supersedesDocumentId: string | null;
  uploadedByName: string | null;
  evidenceLinks: Array<{ evidenceItemId: string; evidenceType: string; status: string }>;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type DocumentTemplate = {
  id: string;
  name: string;
  templateType: DocumentTemplateType;
  matterType: MatterType | null;
  description: string | null;
  isActive: boolean;
  versions: DocumentTemplateVersion[];
  createdAt: string;
  updatedAt: string;
};

export type DocumentTemplateVersion = {
  id: string;
  templateId: string;
  versionNumber: number;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  footerTemplate: string | null;
  mergeFieldSchema: MergeFieldSchema;
  status: TemplateVersionStatus;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type MergeFieldSchema = {
  required: string[];
  optional: string[];
};

export type PackageRecipient = {
  id: string;
  recipientNameSnapshot: string;
  organizationNameSnapshot: string | null;
  emailAddress: string | null;
  emailSource: EmailSource;
  recipientRole: RecipientRole;
  relationshipToMatter: string | null;
  verificationStatus: VerificationStatus;
  verifiedByName: string | null;
  verifiedAt: string | null;
  verificationNote: string | null;
  isPrimary: boolean;
};

export type PackageDocument = {
  id: string;
  documentId: string;
  title: string;
  documentVersionNumberSnapshot: number;
  displayFilenameSnapshot: string;
  documentTypeSnapshot: MatterDocumentType;
  scanStatus: DocumentScanStatus;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  sortOrder: number;
  isRequired: boolean;
};

export type PackageValidation = {
  id: string;
  validationKey: string;
  status: PackageValidationStatus;
  severity: PackageValidationSeverity;
  title: string;
  description: string;
  overrideReason: string | null;
  resolvedAt: string | null;
};

export type PackageReview = {
  id: string;
  reviewerName: string | null;
  reviewType: PackageReviewType;
  decision: PackageReviewDecision;
  comments: string | null;
  createdAt: string;
};

export type OutboundPackage = {
  id: string;
  matterId: string;
  matterName: string;
  carrierName: string;
  packageType: OutboundPackageType;
  status: OutboundPackageStatus;
  title: string;
  subjectLine: string | null;
  coverDocumentId: string | null;
  templateVersionId: string | null;
  amountDemanded: number | null;
  responseDeadline: string | null;
  paymentInstructions: string | null;
  claimNumberSnapshot: string | null;
  insuredNameSnapshot: string | null;
  responsiblePartySnapshot: string | null;
  carrierNameSnapshot: string | null;
  matterAmountSoughtSnapshot: number | null;
  notes: string | null;
  assignedToName: string | null;
  createdByName: string | null;
  submittedForReviewAt: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipients: PackageRecipient[];
  documents: PackageDocument[];
  validations: PackageValidation[];
  reviews: PackageReview[];
};

export type PackageWorkspaceQuery = {
  q: string;
  status: string;
  packageType: string;
  verification: string;
  view: string;
  sort: PackageSort;
  page: number;
  pageSize: number;
};

export type PackageSort = "awaiting_review" | "response_deadline" | "updated_desc" | "amount_demanded" | "carrier" | "package_type";

export type PackageWorkspaceResult = {
  packages: OutboundPackage[];
  query: PackageWorkspaceQuery;
  totalCount: number;
  rangeStart: number;
  rangeEnd: number;
  viewCounts: Record<string, number>;
};

export type DocumentPackagePermissions = {
  canUploadDocuments: boolean;
  canArchiveDocuments: boolean;
  canUseRestrictedDocuments: boolean;
  canBuildPackages: boolean;
  canVerifyRecipients: boolean;
  canReviewPackages: boolean;
  canApprovePackages: boolean;
  canManageTemplates: boolean;
};

export function permissionsForRole(role: ProfileRole): DocumentPackagePermissions {
  return {
    canUploadDocuments: ["admin", "partner", "attorney", "staff"].includes(role),
    canArchiveDocuments: ["admin", "partner", "attorney"].includes(role),
    canUseRestrictedDocuments: ["admin", "partner", "attorney"].includes(role),
    canBuildPackages: ["admin", "partner", "attorney", "staff"].includes(role),
    canVerifyRecipients: ["admin", "partner", "attorney", "staff"].includes(role),
    canReviewPackages: ["admin", "partner", "attorney", "staff"].includes(role),
    canApprovePackages: ["admin", "partner", "attorney"].includes(role),
    canManageTemplates: ["admin", "partner"].includes(role),
  };
}
