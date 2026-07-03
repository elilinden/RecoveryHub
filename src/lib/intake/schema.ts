import { z } from "zod";

export const matterTypeOptions = [
  { value: "auto_subrogation", label: "Auto subrogation" },
  { value: "property_damage", label: "Property damage" },
  { value: "workers_compensation_recovery", label: "Workers' compensation recovery" },
  { value: "health_plan_recovery", label: "Health-plan recovery" },
  { value: "commercial_loss", label: "Commercial loss" },
  { value: "product_related_loss", label: "Product-related loss" },
  { value: "construction_loss", label: "Construction loss" },
  { value: "insurance_defense", label: "Insurance defense" },
  { value: "other", label: "Other" },
] as const;

export const insuranceStatusOptions = [
  { value: "confirmed_coverage", label: "Confirmed coverage" },
  { value: "identified_unconfirmed", label: "Insurance identified but unconfirmed" },
  { value: "no_insurance_identified", label: "No insurance identified" },
  { value: "uninsured", label: "Uninsured" },
  { value: "unknown", label: "Unknown" },
] as const;

export const assessmentOptions = [
  { value: "strong", label: "Strong" },
  { value: "moderate", label: "Moderate" },
  { value: "weak", label: "Weak" },
  { value: "unknown", label: "Unknown" },
] as const;

export const priorityOptions = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
] as const;

export const stageOptions = [
  { value: "new_referral", label: "New referral" },
  { value: "initial_review", label: "Initial review" },
] as const;

export const nextActionOptions = [
  "Complete initial review",
  "Request missing documents",
  "Locate adverse insurance",
  "Investigate liability",
  "Prepare demand",
  "Request settlement authority",
  "Review for arbitration",
  "Review for litigation",
  "Place on hold",
  "Recommend closure",
] as const;

export const partyRoleOptions = [
  { value: "insured", label: "Insured" },
  { value: "responsible_party", label: "Responsible party" },
  { value: "claimant", label: "Claimant" },
  { value: "plaintiff", label: "Plaintiff" },
  { value: "defendant", label: "Defendant" },
  { value: "adverse_insurer", label: "Adverse insurer" },
  { value: "opposing_counsel", label: "Opposing counsel" },
  { value: "witness", label: "Witness" },
  { value: "expert", label: "Expert" },
  { value: "medical_provider", label: "Medical provider" },
  { value: "repair_facility", label: "Repair facility" },
  { value: "other", label: "Other" },
] as const;

export const evidenceTypeOptions = [
  { value: "police_or_incident_report", label: "Police or incident report" },
  { value: "photographs", label: "Photographs" },
  { value: "video", label: "Video" },
  { value: "witness_statement", label: "Witness statement" },
  { value: "repair_estimate", label: "Repair estimate" },
  { value: "repair_invoice", label: "Repair invoice" },
  { value: "payment_ledger", label: "Payment ledger" },
  { value: "expert_report", label: "Expert report" },
  { value: "medical_records", label: "Medical records" },
  { value: "correspondence", label: "Correspondence" },
  { value: "insurance_information", label: "Insurance information" },
  { value: "plan_document", label: "Plan document" },
  { value: "other", label: "Other" },
] as const;

export const evidenceStatusOptions = [
  { value: "received", label: "Received" },
  { value: "requested", label: "Requested" },
  { value: "missing", label: "Missing" },
  { value: "not_available", label: "Not available" },
  { value: "not_applicable", label: "Not applicable" },
] as const;

export const yesNoUnknownOptions = ["yes", "no", "unknown", "not_applicable"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));
const idString = z.string().trim().min(1);
const dateString = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.");
function optionValues<const T extends readonly [{ value: string }, ...{ value: string }[]]>(options: T) {
  return options.map((option) => option.value) as [T[number]["value"], ...Array<T[number]["value"]>];
}
const currencyString = z
  .string()
  .trim()
  .default("0")
  .refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value), "Enter a non-negative dollar amount.");

export const intakeStepOneSchema = z.object({
  carrierId: idString.min(1, "Select the carrier for this matter."),
  carrierClaimNumber: z.string().trim().min(1, "Enter the carrier claim number."),
  firmMatterNumber: optionalString,
  matterName: z.string().trim().min(1, "Enter a matter name."),
  matterType: z.enum(optionValues(matterTypeOptions)),
  dateReferred: dateString.refine(Boolean, "Enter the date this referral was received."),
  dateOfLoss: optionalString,
  jurisdiction: optionalString,
  venue: optionalString,
  assignedAdjusterId: optionalString,
  carrierSupervisorId: optionalString,
  assignedAttorneyId: optionalString,
  assignedStaffId: optionalString,
  supervisingPartnerId: optionalString,
}).refine((value) => Boolean(value.assignedAttorneyId || value.assignedStaffId || value.supervisingPartnerId), {
  message: "Select the attorney or firm user responsible for this matter.",
  path: ["assignedAttorneyId"],
});

export const intakePartySchema = z.object({
  id: z.string(),
  mode: z.enum(["contact", "organization"]),
  contactId: optionalString,
  organizationId: optionalString,
  firstName: optionalString,
  lastName: optionalString,
  organizationName: optionalString,
  role: z.enum(optionValues(partyRoleOptions)),
  isPrimary: z.boolean(),
  notes: optionalString,
});

export const intakeEvidenceSchema = z.object({
  evidenceType: z.enum(optionValues(evidenceTypeOptions)),
  status: z.enum(optionValues(evidenceStatusOptions)),
  notes: optionalString,
});

export const intakeStepTwoSchema = z.object({
  amountPaid: currencyString,
  deductible: currencyString,
  anticipatedAdditionalPayments: currencyString,
  recoverableExpenses: currencyString,
  amountSought: currencyString,
  estimatedLegalCost: currencyString.optional(),
  amountSoughtManuallyChanged: z.boolean(),
  insuranceStatus: z.enum(optionValues(insuranceStatusOptions)),
  adverseInsurer: optionalString,
  adverseClaimNumber: optionalString,
  adverseAdjuster: optionalString,
  policyLimits: currencyString.optional(),
  liabilityAssessment: z.enum(optionValues(assessmentOptions)),
  collectabilityAssessment: z.enum(optionValues(assessmentOptions)),
  liabilitySummary: optionalString,
  parties: z.array(intakePartySchema),
  evidence: z.array(intakeEvidenceSchema),
  healthPlan: z
    .object({
      medicareStatus: z.enum(yesNoUnknownOptions),
      medicaidStatus: z.enum(yesNoUnknownOptions),
      ssdiEligibility: z.enum(yesNoUnknownOptions),
      erisaPlanStatus: z.enum(yesNoUnknownOptions),
      fundingStatus: z.enum(yesNoUnknownOptions),
      masterPlanDocumentReceived: z.enum(yesNoUnknownOptions),
      conditionalPaymentStatus: z.enum(yesNoUnknownOptions),
    })
    .optional(),
  insuranceDefense: z
    .object({
      exposureRange: optionalString,
      reserveRecommendation: currencyString.optional(),
      litigationBudget: currencyString.optional(),
      carrierReportDueDate: optionalString,
    })
    .optional(),
});

export const intakeStepThreeSchema = z.object({
  statuteDeadline: optionalString,
  statuteDeadlineUnknownAcknowledged: z.boolean(),
  verifyStatuteDeadline: z.boolean(),
  otherDeadline: optionalString,
  deadlineType: z.string().trim().default("other"),
  reminderDate: optionalString,
  deadlineAssignedTo: optionalString,
  priority: z.enum(optionValues(priorityOptions)),
  stage: z.enum(optionValues(stageOptions)),
  nextAction: z.enum(nextActionOptions),
  customNextAction: optionalString,
  nextActionDueDate: dateString,
  nextActionAssignedTo: idString.min(1, "Select the person responsible for the next action."),
  internalNotes: optionalString,
}).refine((value) => Boolean(value.statuteDeadline || value.statuteDeadlineUnknownAcknowledged), {
  message: "Enter a statute deadline or acknowledge that it requires immediate review.",
  path: ["statuteDeadline"],
});

export const intakeSchema = z.object({
  id: optionalString,
  step: z.number().int().min(1).max(3),
  stepOne: intakeStepOneSchema,
  stepTwo: intakeStepTwoSchema,
  stepThree: intakeStepThreeSchema,
});

export type IntakeFormData = z.infer<typeof intakeSchema>;
export type IntakeStepOne = z.infer<typeof intakeStepOneSchema>;

export function calculateSuggestedAmountSought(input: {
  amountPaid: string;
  deductible: string;
  recoverableExpenses: string;
}) {
  const cents = [input.amountPaid, input.deductible, input.recoverableExpenses].reduce((total, value) => {
    const parsed = Number.parseFloat(value || "0");
    return total + Math.round((Number.isFinite(parsed) ? parsed : 0) * 100);
  }, 0);

  return (cents / 100).toFixed(2);
}

export function validateIntakeStep(step: number, data: IntakeFormData) {
  if (step === 1) {
    return intakeStepOneSchema.safeParse(data.stepOne);
  }
  if (step === 2) {
    return intakeStepTwoSchema.safeParse(data.stepTwo);
  }
  return intakeStepThreeSchema.safeParse(data.stepThree);
}

export function createEmptyIntake(): IntakeFormData {
  return {
    step: 1,
    stepOne: {
      carrierId: "",
      carrierClaimNumber: "",
      firmMatterNumber: "",
      matterName: "",
      matterType: "auto_subrogation",
      dateReferred: new Date().toISOString().slice(0, 10),
      dateOfLoss: "",
      jurisdiction: "",
      venue: "",
      assignedAdjusterId: "",
      carrierSupervisorId: "",
      assignedAttorneyId: "",
      assignedStaffId: "",
      supervisingPartnerId: "",
    },
    stepTwo: {
      amountPaid: "0.00",
      deductible: "0.00",
      anticipatedAdditionalPayments: "0.00",
      recoverableExpenses: "0.00",
      amountSought: "0.00",
      estimatedLegalCost: "0.00",
      amountSoughtManuallyChanged: false,
      insuranceStatus: "unknown",
      adverseInsurer: "",
      adverseClaimNumber: "",
      adverseAdjuster: "",
      policyLimits: "0.00",
      liabilityAssessment: "unknown",
      collectabilityAssessment: "unknown",
      liabilitySummary: "",
      parties: [],
      evidence: evidenceTypeOptions.map((option) => ({
        evidenceType: option.value,
        status: "not_applicable",
        notes: "",
      })),
    },
    stepThree: {
      statuteDeadline: "",
      statuteDeadlineUnknownAcknowledged: false,
      verifyStatuteDeadline: false,
      otherDeadline: "",
      deadlineType: "other",
      reminderDate: "",
      deadlineAssignedTo: "",
      priority: "normal",
      stage: "new_referral",
      nextAction: "Complete initial review",
      customNextAction: "",
      nextActionDueDate: "",
      nextActionAssignedTo: "",
      internalNotes: "",
    },
  };
}
