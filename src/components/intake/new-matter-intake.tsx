"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Clock3, PlusCircle, Save, X } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCarrierAction,
  addCarrierContactAction,
  cancelIntakeAction,
  checkDuplicateMattersAction,
  completeIntakeAction,
  saveIntakeDraftAction,
  type DuplicateMatterMatch,
} from "@/lib/intake/actions";
import {
  assessmentOptions,
  calculateSuggestedAmountSought,
  createEmptyIntake,
  evidenceTypeOptions,
  evidenceStatusOptions,
  getIntakeIssueGroups,
  insuranceStatusOptions,
  matterTypeOptions,
  nextActionOptions,
  partyRoleOptions,
  priorityOptions,
  recommendedEvidenceByMatterType,
  stageOptions,
  validateIntakeStep,
  yesNoUnknownOptions,
  type IntakeFormData,
} from "@/lib/intake/schema";
import { filterContactsByCarrier, type IntakeCarrier, type IntakeCarrierContact, type IntakeOptions, type IntakeUser } from "@/lib/intake/types";
import { cn } from "@/lib/utils";

type NewMatterIntakeProps = {
  options: IntakeOptions;
  initialData?: IntakeFormData | null;
  matterId?: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const steps = [
  { id: 1, title: "Matter Details", subtitle: "Enter the basic referral, carrier, and assignment information." },
  { id: 2, title: "Recovery Details", subtitle: "Record the financial information, insurance status, parties, and evidence." },
  { id: 3, title: "Review and Route", subtitle: "Confirm deadlines, identify the next action, and review the matter." },
] as const;

const localStorageKey = "recovery-hub:new-matter-intake";
function Field({ label, children, error, help, required }: { label: string; children: React.ReactNode; error?: string; help?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-[var(--urgent)]">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? <p className="text-sm text-[var(--urgent)]">{error}</p> : null}
      {help ? <p className="text-sm leading-5 text-muted-foreground">{help}</p> : null}
    </div>
  );
}

function inputClass(error?: string) {
  return cn("h-10 rounded-lg border-border bg-card", error && "border-[color:var(--urgent)]");
}

function selectClass(error?: string) {
  return cn(
    "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25",
    error && "border-[color:var(--urgent)]"
  );
}

function textAreaClass(error?: string) {
  return cn(
    "min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25",
    error && "border-[color:var(--urgent)]"
  );
}

function formatEvidenceType(value: string) {
  const option = evidenceTypeOptions.find((item) => item.value === value);
  if (option) return option.label;
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeIdList(ids: Array<string | undefined>) {
  return [...new Set(ids.map((id) => id?.trim() ?? "").filter(Boolean))];
}

function userNames(users: IntakeUser[], ids: string[]) {
  const names = ids
    .map((id) => users.find((user) => user.id === id)?.fullName)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : "Not assigned";
}

function mergeCarrierContacts(incoming: IntakeCarrierContact[], existing: IntakeCarrierContact[]) {
  const contacts = new Map(existing.map((contact) => [contact.id, contact]));
  incoming.forEach((contact) => contacts.set(contact.id, contact));
  return Array.from(contacts.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function mergeCarriers(incoming: IntakeCarrier[], existing: IntakeCarrier[]) {
  const carriers = new Map(existing.map((carrier) => [carrier.id, carrier]));
  incoming.forEach((carrier) => carriers.set(carrier.id, carrier));
  return Array.from(carriers.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeIntakeData(input?: Partial<IntakeFormData> | null): IntakeFormData {
  const empty = createEmptyIntake();
  if (!input) return empty;
  const stepOne = { ...empty.stepOne, ...(input.stepOne ?? {}) };
  const stepTwo = { ...empty.stepTwo, ...(input.stepTwo ?? {}) };
  const stepThree = { ...empty.stepThree, ...(input.stepThree ?? {}) };
  const assignedAttorneyIds = normalizeIdList([...(stepOne.assignedAttorneyIds ?? []), stepOne.assignedAttorneyId]);
  const assignedStaffIds = normalizeIdList([...(stepOne.assignedStaffIds ?? []), stepOne.assignedStaffId]);

  return {
    ...empty,
    ...input,
    step: input.step ?? empty.step,
    stepOne: {
      ...stepOne,
      assignedAttorneyId: assignedAttorneyIds[0] ?? "",
      assignedAttorneyIds,
      assignedStaffId: assignedStaffIds[0] ?? "",
      assignedStaffIds,
      supervisingPartnerId: "",
    },
    stepTwo: {
      ...stepTwo,
      evidence: stepTwo.evidence ?? [],
      parties: stepTwo.parties ?? [],
    },
    stepThree,
  };
}

function statusLabel(status: SaveState, lastSavedAt?: string) {
  if (status === "saving") return "Saving...";
  if (status === "error") return "Unable to save";
  if (status === "saved" && lastSavedAt) return `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return "Not saved yet";
}

function getInitialIntakeData(initialData?: IntakeFormData | null) {
  if (initialData) return normalizeIntakeData(initialData);
  if (typeof window === "undefined") return normalizeIntakeData();

  const saved = window.localStorage.getItem(localStorageKey);
  if (!saved) return normalizeIntakeData();

  try {
    return normalizeIntakeData(JSON.parse(saved) as Partial<IntakeFormData>);
  } catch {
    window.localStorage.removeItem(localStorageKey);
    return normalizeIntakeData();
  }
}

export function NewMatterIntake({ options, initialData, matterId: initialMatterId }: NewMatterIntakeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<IntakeFormData>(() => getInitialIntakeData(initialData));
  const [step, setStep] = useState(() => data.step ?? 1);
  const [matterId, setMatterId] = useState(initialMatterId ?? initialData?.id ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatterMatch[]>([]);
  const [acknowledgedDuplicate, setAcknowledgedDuplicate] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(() => Boolean(initialMatterId ?? initialData?.id));
  const [dirty, setDirty] = useState(false);
  const [addedCarriers, setAddedCarriers] = useState<IntakeCarrier[]>([]);
  const [addedCarrierContacts, setAddedCarrierContacts] = useState<IntakeCarrierContact[]>([]);
  const pendingAutosave = useRef(false);

  const carriers = useMemo(
    () => mergeCarriers(addedCarriers, options.carriers),
    [addedCarriers, options.carriers]
  );
  const intakeOptions = useMemo(
    () => ({ ...options, carriers }),
    [carriers, options]
  );
  const carrierContacts = useMemo(
    () => mergeCarrierContacts(addedCarrierContacts, intakeOptions.carrierContacts),
    [addedCarrierContacts, intakeOptions.carrierContacts]
  );
  const selectedCarrier = carriers.find((carrier) => carrier.id === data.stepOne.carrierId);
  const adjusters = useMemo(
    () => filterContactsByCarrier(carrierContacts, data.stepOne.carrierId, "adjuster"),
    [carrierContacts, data.stepOne.carrierId]
  );
  const supervisors = useMemo(
    () => carrierContacts.filter((contact) => contact.carrierId === data.stepOne.carrierId && contact.contactType !== "adjuster"),
    [carrierContacts, data.stepOne.carrierId]
  );
  const assignedAdjuster = carrierContacts.find((contact) => contact.id === data.stepOne.assignedAdjusterId);
  const suggestedAmount = calculateSuggestedAmountSought(data.stepTwo);
  const issueGroups = getIntakeIssueGroups(data);
  const unresolvedIssues = [...issueGroups.required, ...issueGroups.followUp];

  useEffect(() => {
    if (!matterId) {
      window.localStorage.setItem(localStorageKey, JSON.stringify({ ...data, step }));
    }
  }, [data, matterId, step]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!matterId) return;
    const timer = window.setTimeout(() => {
      if (pendingAutosave.current) return;
      pendingAutosave.current = true;
      setSaveState("saving");
      startTransition(async () => {
        const result = await saveIntakeDraftAction({ matterId, data: { ...data, step }, step });
        pendingAutosave.current = false;
        if (result.ok) {
          setSaveState("saved");
          setLastSavedAt(result.savedAt);
          setMessage(undefined);
          setDirty(false);
        } else {
          setSaveState("error");
          setMessage(result.message);
        }
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [data, matterId, startTransition, step]);

  function updateStepOne<K extends keyof IntakeFormData["stepOne"]>(key: K, value: IntakeFormData["stepOne"][K]) {
    setData((current) => ({
      ...current,
      stepOne: {
        ...current.stepOne,
        [key]: value,
        ...(key === "carrierId" ? { assignedAdjusterId: "", carrierSupervisorId: "" } : {}),
      },
    }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setHasInteracted(true);
    setDirty(true);
  }

  function updateStepTwo<K extends keyof IntakeFormData["stepTwo"]>(key: K, value: IntakeFormData["stepTwo"][K]) {
    setData((current) => {
      const next = { ...current.stepTwo, [key]: value };
      const currencyKey = key === "amountPaid" || key === "deductible" || key === "recoverableExpenses";
      if (currencyKey && !next.amountSoughtManuallyChanged) {
        next.amountSought = calculateSuggestedAmountSought({
          amountPaid: String(next.amountPaid),
          deductible: String(next.deductible),
          recoverableExpenses: String(next.recoverableExpenses),
        });
      }
      return { ...current, stepTwo: next };
    });
    setHasInteracted(true);
    setDirty(true);
  }

  function updateStepThree<K extends keyof IntakeFormData["stepThree"]>(key: K, value: IntakeFormData["stepThree"][K]) {
    setData((current) => ({ ...current, stepThree: { ...current.stepThree, [key]: value } }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setHasInteracted(true);
    setDirty(true);
  }

  async function continueStep() {
    const validation = validateIntakeStep(step, { ...data, step });
    if (!validation.success) {
      setFieldErrors(flattenStepErrors(validation.error));
      focusFirstInvalid();
      return;
    }

    if (step === 1) {
      const duplicates = await checkDuplicateMattersAction({
        carrierId: data.stepOne.carrierId,
        carrierClaimNumber: data.stepOne.carrierClaimNumber,
        dateOfLoss: data.stepOne.dateOfLoss,
        matterName: data.stepOne.matterName,
      });
      setDuplicateMatches(duplicates.filter((match) => match.id !== matterId));
      if (!matterId) {
        await saveDraft(false, 2);
      }
    }

    setFieldErrors({});
    setStep((current) => Math.min(3, current + 1));
    setData((current) => ({ ...current, step: Math.min(3, step + 1) }));
  }

  async function saveDraft(exit: boolean, nextStep = step) {
    setSaveState("saving");
    const result = await saveIntakeDraftAction({ matterId: matterId || undefined, data: { ...data, step: nextStep }, step: nextStep, exit });
    if (result.ok) {
      setMatterId(result.matterId);
      setSaveState("saved");
      setLastSavedAt(result.savedAt);
      setMessage(result.message);
      setDirty(false);
      window.localStorage.removeItem(localStorageKey);
      if (result.redirectTo) router.push(result.redirectTo);
    } else {
      setSaveState("error");
      setMessage(result.message);
      setFieldErrors(result.fieldErrors ?? {});
    }
  }

  async function completeIntake() {
    const validation = validateIntakeStep(3, { ...data, step: 3 });
    if (!validation.success) {
      setFieldErrors(flattenStepErrors(validation.error));
      focusFirstInvalid();
      return;
    }

    setSaveState("saving");
    const result = await completeIntakeAction({ matterId: matterId || undefined, data: { ...data, step: 3 }, acknowledgedDuplicate });
    if (result.ok) {
      window.localStorage.removeItem(localStorageKey);
      router.push(result.redirectTo ?? `/matters/${result.matterId}`);
      return;
    }
    setSaveState("error");
    setMessage(result.message);
    setFieldErrors(result.fieldErrors ?? {});
    if (result.duplicateMatches) {
      setDuplicateMatches(result.duplicateMatches);
    }
  }

  async function cancelIntake(mode: "archive" | "delete") {
    const result = await cancelIntakeAction({ matterId: matterId || undefined, mode });
    if (result.ok && result.redirectTo) {
      window.localStorage.removeItem(localStorageKey);
      router.push(result.redirectTo);
    } else if (!result.ok) {
      setMessage(result.message);
    }
  }

  function addParty(role: IntakeFormData["stepTwo"]["parties"][number]["role"]) {
    const mode = role === "adverse_insurer" ? "organization" : "contact";
    setData((current) => ({
      ...current,
      stepTwo: {
        ...current.stepTwo,
        parties: [
          ...current.stepTwo.parties,
          {
            id: crypto.randomUUID(),
            mode,
            contactId: "",
            organizationId: "",
            firstName: "",
            lastName: "",
            organizationName: "",
            role,
            isPrimary: current.stepTwo.parties.length === 0,
            notes: "",
          },
        ],
      },
    }));
    setHasInteracted(true);
    setDirty(true);
  }

  function updateParty(index: number, key: string, value: string | boolean) {
    setData((current) => ({
      ...current,
      stepTwo: {
        ...current.stepTwo,
        parties: current.stepTwo.parties.map((party, partyIndex) =>
          partyIndex === index ? { ...party, [key]: value } : party
        ),
      },
    }));
    setHasInteracted(true);
    setDirty(true);
  }

  function removeParty(index: number) {
    setData((current) => {
      const removedParty = current.stepTwo.parties[index];
      const parties = current.stepTwo.parties.filter((_, partyIndex) => partyIndex !== index);
      const nextParties =
        removedParty?.isPrimary && parties.length > 0 && !parties.some((party) => party.isPrimary)
          ? parties.map((party, partyIndex) => (partyIndex === 0 ? { ...party, isPrimary: true } : party))
          : parties;

      return {
        ...current,
        stepTwo: {
          ...current.stepTwo,
          parties: nextParties,
        },
      };
    });
    setHasInteracted(true);
    setDirty(true);
  }

  function updateEvidence(index: number, key: string, value: string) {
    setData((current) => ({
      ...current,
      stepTwo: {
        ...current.stepTwo,
        evidence: current.stepTwo.evidence.map((evidence, evidenceIndex) =>
          evidenceIndex === index ? { ...evidence, [key]: value } : evidence
        ),
      },
    }));
  }

  function addEvidenceItem(evidenceType: string) {
    const trimmed = evidenceType.trim();
    if (!trimmed) return;
    setData((current) => {
      const exists = current.stepTwo.evidence.some((item) => item.evidenceType.toLowerCase() === trimmed.toLowerCase());
      if (exists) return current;
      return {
        ...current,
        stepTwo: {
          ...current.stepTwo,
          evidence: [
            ...current.stepTwo.evidence,
            {
              evidenceType: trimmed,
              status: "missing",
              notes: "",
            },
          ],
        },
      };
    });
    setHasInteracted(true);
    setDirty(true);
  }

  function removeEvidenceItem(index: number) {
    setData((current) => ({
      ...current,
      stepTwo: {
        ...current.stepTwo,
        evidence: current.stepTwo.evidence.filter((_, evidenceIndex) => evidenceIndex !== index),
      },
    }));
    setHasInteracted(true);
    setDirty(true);
  }

  return (
    <div className="space-y-6">
      <StepIndicator step={step} setStep={(nextStep) => nextStep < step && setStep(nextStep)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{steps[step - 1].title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{steps[step - 1].subtitle}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                  {saveState === "saved" ? <CheckCircle2 aria-hidden="true" className="size-4 text-[var(--success)]" /> : null}
                  {saveState === "saving" ? <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" /> : null}
                  {saveState === "error" ? <AlertCircle aria-hidden="true" className="size-4 text-[var(--urgent)]" /> : null}
                  <span>{statusLabel(saveState, lastSavedAt)}</span>
                </div>
              </div>

              {message ? (
                <div className="mt-5 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground">
                  {message}
                </div>
              ) : null}

              {duplicateMatches.length > 0 ? (
                <DuplicateWarning
                  acknowledged={acknowledgedDuplicate}
                  matches={duplicateMatches}
                  onAcknowledge={setAcknowledgedDuplicate}
                />
              ) : null}

              <div className="mt-6">
                {step === 1 ? (
                  <MatterDetailsStep
                    adjusters={adjusters}
                    data={data}
                    errors={fieldErrors}
                    options={intakeOptions}
                    selectedAdjuster={assignedAdjuster}
                    selectedCarrier={selectedCarrier}
                    supervisors={supervisors}
                    onCarrierAdded={(carrier) => {
                      setAddedCarriers((current) => mergeCarriers([carrier], current));
                      updateStepOne("carrierId", carrier.id);
                    }}
                    onCarrierContactAdded={(contact) => setAddedCarrierContacts((current) => mergeCarrierContacts([contact], current))}
                    update={updateStepOne}
                  />
                ) : null}
                {step === 2 ? (
                  <RecoveryDetailsStep
                    data={data}
                    errors={fieldErrors}
                    options={intakeOptions}
                    suggestedAmount={suggestedAmount}
                    addEvidence={addEvidenceItem}
                    removeEvidence={removeEvidenceItem}
                    removeParty={removeParty}
                    updateEvidence={updateEvidence}
                    updateParty={updateParty}
                    updateStepTwo={updateStepTwo}
                    onAddParty={addParty}
                  />
                ) : null}
                {step === 3 ? (
                  <ReviewRouteStep
                    carrierContacts={carrierContacts}
                    data={data}
                    errors={fieldErrors}
                    issueGroups={issueGroups}
                    options={intakeOptions}
                    unresolvedIssues={hasInteracted ? unresolvedIssues : []}
                    update={updateStepThree}
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 rounded-lg border border-border bg-card/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button asChild type="button" variant="outline">
                <Link href="/matters">Back to matters</Link>
              </Button>
              <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    Cancel Intake
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel intake?</DialogTitle>
                    <DialogDescription>
                      Archive keeps the draft available from Matters filters. Delete permanently removes this draft when it has been saved.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
                      Keep editing
                    </Button>
                    <Button type="button" variant="outline" onClick={() => cancelIntake("archive")}>
                      Archive draft
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => cancelIntake("delete")}>
                      Delete draft
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button className="gap-2" disabled={isPending} type="button" variant="outline" onClick={() => saveDraft(true)}>
                <Save aria-hidden="true" className="size-4" />
                Save and Exit
              </Button>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep((current) => current - 1);
                    setData((current) => ({ ...current, step: Math.max(1, step - 1) }));
                  }}
                >
                  Back
                </Button>
              ) : null}
              {step < 3 ? (
                <Button disabled={isPending} type="button" onClick={continueStep}>
                  Continue
                </Button>
              ) : (
                <Button disabled={isPending || !intakeOptions.permission.canCreateMatter || issueGroups.required.length > 0} type="button" onClick={completeIntake}>
                  Complete Intake
                </Button>
              )}
            </div>
          </div>
        </div>

        <IntakeSummary
          data={data}
          hasInteracted={hasInteracted}
          options={intakeOptions}
          selectedAdjuster={assignedAdjuster}
          selectedCarrier={selectedCarrier}
          unresolvedIssues={unresolvedIssues}
        />
      </div>
    </div>
  );
}

function StepIndicator({ step, setStep }: { step: number; setStep: (step: number) => void }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <ol className="grid gap-3 md:grid-cols-3" aria-label="Matter intake progress">
          {steps.map((item) => {
            const complete = item.id < step;
            const active = item.id === step;
            return (
              <li key={item.id}>
                <button
                  className={cn(
                    "flex min-h-12 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    active && "border-primary bg-[var(--info-muted)]",
                    complete && "border-[color:var(--success)]/30 bg-[var(--success-muted)]",
                    !active && !complete && "border-border bg-background text-muted-foreground"
                  )}
                  disabled={!complete}
                  onClick={() => setStep(item.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      active && "bg-primary text-primary-foreground",
                      complete && "bg-[var(--success)] text-white",
                      !active && !complete && "bg-secondary text-muted-foreground"
                    )}
                  >
                    {complete ? <CheckCircle2 aria-hidden="true" className="size-4" /> : item.id}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {complete ? "Completed" : active ? "Current step" : "Locked until previous step is complete"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function MatterDetailsStep(props: {
  data: IntakeFormData;
  errors: Record<string, string>;
  options: IntakeOptions;
  selectedCarrier?: { id: string; name: string };
  selectedAdjuster?: IntakeCarrierContact;
  adjusters: IntakeCarrierContact[];
  supervisors: IntakeCarrierContact[];
  onCarrierAdded: (carrier: IntakeCarrier) => void;
  onCarrierContactAdded: (contact: IntakeCarrierContact) => void;
  update: <K extends keyof IntakeFormData["stepOne"]>(key: K, value: IntakeFormData["stepOne"][K]) => void;
}) {
  const { data, errors, options, selectedAdjuster, adjusters, supervisors, onCarrierAdded, onCarrierContactAdded, update } = props;
  const attorneys = options.users.filter((user) => ["admin", "partner", "attorney"].includes(user.role));
  const staff = options.users.filter((user) => user.role === "staff");
  const responsibleUsers = options.users.filter((user) => ["admin", "partner", "attorney", "staff"].includes(user.role));
  const assignedAttorneyIds = normalizeIdList([...(data.stepOne.assignedAttorneyIds ?? []), data.stepOne.assignedAttorneyId]);
  const assignedStaffIds = normalizeIdList([...(data.stepOne.assignedStaffIds ?? []), data.stepOne.assignedStaffId]);
  const leadAttorneyId = data.stepOne.assignedAttorneyId || assignedAttorneyIds[0] || "";
  const additionalAttorneyIds = assignedAttorneyIds.filter((id) => id !== leadAttorneyId);

  function updateLeadAttorneyId(nextId: string) {
    const nextIds = normalizeIdList([nextId, ...additionalAttorneyIds]);
    update("assignedAttorneyIds", nextIds);
    update("assignedAttorneyId", nextId);
  }

  function updateAdditionalAttorneyIds(nextIds: string[]) {
    const combinedIds = normalizeIdList([leadAttorneyId, ...nextIds]);
    update("assignedAttorneyIds", combinedIds);
    update("assignedAttorneyId", leadAttorneyId || combinedIds[0] || "");
  }

  function updateStaffIds(nextIds: string[]) {
    update("assignedStaffIds", nextIds);
    update("assignedStaffId", nextIds[0] ?? "");
  }

  return (
    <div className="space-y-8">
      {options.carriers.length === 0 ? (
        <EmptyState description="Add an active carrier before starting intake." title="No active carriers" />
      ) : null}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Referral Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field error={errors.carrierId} required label="Carrier">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select className={cn(selectClass(errors.carrierId), "sm:flex-1")} value={data.stepOne.carrierId} onChange={(event) => update("carrierId", event.target.value)}>
                <option value="">Select carrier</option>
                {options.carriers.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </option>
                ))}
              </select>
              <AddCarrierDialog
                buttonClassName="h-10 shrink-0 gap-2"
                disabled={!options.permission.canAddCarrier}
                onCarrierAdded={onCarrierAdded}
              />
            </div>
          </Field>
          <Field error={errors.carrierClaimNumber} required label="Carrier claim number">
            <Input className={inputClass(errors.carrierClaimNumber)} value={data.stepOne.carrierClaimNumber} onChange={(event) => update("carrierClaimNumber", event.target.value)} />
          </Field>
          <Field error={errors.matterName} required label="Matter name">
            <Input className={inputClass(errors.matterName)} value={data.stepOne.matterName} onChange={(event) => update("matterName", event.target.value)} />
          </Field>
          <Field error={errors.matterType} required label="Matter type">
            <select className={selectClass(errors.matterType)} value={data.stepOne.matterType} onChange={(event) => update("matterType", event.target.value as IntakeFormData["stepOne"]["matterType"])}>
              {matterTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field error={errors.dateReferred} required label="Date referred">
            <Input className={inputClass(errors.dateReferred)} type="date" value={data.stepOne.dateReferred} onChange={(event) => update("dateReferred", event.target.value)} />
          </Field>
          <Field error={errors.assignedAttorneyIds ?? errors.assignedAttorneyId} required label="Lead attorney">
            <select className={selectClass(errors.assignedAttorneyIds ?? errors.assignedAttorneyId)} value={leadAttorneyId} onChange={(event) => updateLeadAttorneyId(event.target.value)}>
              <option value="">Select lead attorney</option>
              {attorneys.map((user) => (
                <option key={user.id} value={user.id}>{user.fullName} {user.jobTitle ? `- ${user.jobTitle}` : ""}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {responsibleUsers.length === 0 ? <EmptyState description="No eligible active users are available for assignment." title="No eligible assignees" /> : null}

      <details className="rounded-lg border border-border bg-background p-4">
        <summary className="cursor-pointer text-base font-semibold text-foreground">Optional details</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Firm matter number">
            <Input className={inputClass()} value={data.stepOne.firmMatterNumber ?? ""} onChange={(event) => update("firmMatterNumber", event.target.value)} />
          </Field>
          <Field label="Date of loss">
            <Input className={inputClass()} type="date" value={data.stepOne.dateOfLoss ?? ""} onChange={(event) => update("dateOfLoss", event.target.value)} />
          </Field>
          <Field label="Jurisdiction">
            <Input className={inputClass()} value={data.stepOne.jurisdiction ?? ""} onChange={(event) => update("jurisdiction", event.target.value)} />
          </Field>
          <Field label="Venue">
            <Input className={inputClass()} value={data.stepOne.venue ?? ""} onChange={(event) => update("venue", event.target.value)} />
          </Field>
          <Field
            help={data.stepOne.carrierId && adjusters.length === 0 ? "No active adjusters are listed for this carrier. Add a carrier contact or continue without one." : undefined}
            label="Assigned adjuster"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <select className={cn(selectClass(), "sm:flex-1")} value={data.stepOne.assignedAdjusterId ?? ""} onChange={(event) => update("assignedAdjusterId", event.target.value)}>
                <option value="">Select adjuster</option>
                {adjusters.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.fullName} {contact.jobTitle ? `- ${contact.jobTitle}` : ""}
                  </option>
                ))}
              </select>
              <AddCarrierContactDialog
                buttonLabel="Add Adjuster"
                buttonClassName="h-10 shrink-0 gap-2"
                carrierId={data.stepOne.carrierId}
                defaultContactType="adjuster"
                disabled={!data.stepOne.carrierId || !options.permission.canAddCarrierContact}
                lockedContactType
                onContactAdded={(contact) => {
                  onCarrierContactAdded(contact);
                  update("assignedAdjusterId", contact.id);
                }}
              />
            </div>
          </Field>
          <Field label="Carrier supervisor">
            <select className={selectClass()} value={data.stepOne.carrierSupervisorId ?? ""} onChange={(event) => update("carrierSupervisorId", event.target.value)}>
              <option value="">Optional supervisor</option>
              {supervisors.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.fullName} {contact.jobTitle ? `- ${contact.jobTitle}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <UserMultiSelect
            emptyLabel="No additional attorneys are available."
            label="Additional attorneys"
            selectedIds={additionalAttorneyIds}
            users={attorneys.filter((user) => user.id !== leadAttorneyId)}
            onChange={updateAdditionalAttorneyIds}
          />
          <UserMultiSelect
            emptyLabel="No staff users are available."
            label="Additional staff"
            selectedIds={assignedStaffIds}
            users={staff}
            onChange={updateStaffIds}
          />
          {selectedAdjuster ? (
            <div className="rounded-lg border border-border bg-card p-4 text-sm md:col-span-2">
              <p className="font-medium text-foreground">{selectedAdjuster.fullName}</p>
              <p className="mt-1 text-muted-foreground">
                {[selectedAdjuster.jobTitle, selectedAdjuster.department, selectedAdjuster.email, selectedAdjuster.phone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function UserMultiSelect({
  emptyLabel,
  error,
  label,
  onChange,
  required,
  selectedIds,
  users,
}: {
  emptyLabel: string;
  error?: string;
  label: string;
  onChange: (ids: string[]) => void;
  required?: boolean;
  selectedIds: string[];
  users: IntakeUser[];
}) {
  const selectedUsers = selectedIds
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is IntakeUser => Boolean(user));
  const buttonLabel =
    users.length === 0
      ? emptyLabel
      : selectedUsers.length === 0
        ? `Select ${label.toLowerCase()}`
        : selectedUsers.length === 1
          ? selectedUsers[0].fullName
          : `${selectedUsers.length} selected`;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-[var(--urgent)]">
            *
          </span>
        ) : null}
      </legend>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-invalid={Boolean(error)}
            className={cn(
              "h-auto min-h-10 w-full justify-between gap-2 rounded-lg border-border bg-card px-3 py-2 text-left font-normal shadow-sm",
              error && "border-[color:var(--urgent)]"
            )}
            disabled={users.length === 0}
            type="button"
            variant="outline"
          >
            <span className={cn("min-w-0 flex-1 truncate", selectedUsers.length === 0 && "text-muted-foreground")}>{buttonLabel}</span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-(--radix-dropdown-menu-trigger-width)">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {users.map((user) => {
            const checked = selectedIds.includes(user.id);
            return (
              <DropdownMenuCheckboxItem
                checked={checked}
                className="items-start gap-2 py-2"
                key={user.id}
                onCheckedChange={(nextChecked) => {
                  const nextIds = nextChecked
                    ? normalizeIdList([...selectedIds, user.id])
                    : selectedIds.filter((id) => id !== user.id);
                  onChange(nextIds);
                }}
                onSelect={(event) => event.preventDefault()}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{user.fullName}</span>
                  {user.jobTitle ? <span className="block truncate text-xs text-muted-foreground">{user.jobTitle}</span> : null}
                </span>
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className="text-sm text-[var(--urgent)]">{error}</p> : null}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span className="inline-flex min-h-7 max-w-full items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground" key={user.id}>
              <span className="truncate">{user.fullName}</span>
              <button
                aria-label={`Remove ${user.fullName}`}
                className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
                onClick={() => onChange(selectedIds.filter((id) => id !== user.id))}
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </span>
          ))}
          <p className="basis-full text-sm text-muted-foreground">
            Primary: {users.find((user) => user.id === selectedIds[0])?.fullName ?? "First selected user"}
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}

function AddCarrierDialog({
  buttonClassName,
  disabled,
  onCarrierAdded,
}: {
  buttonClassName?: string;
  disabled: boolean;
  onCarrierAdded: (carrier: IntakeCarrier) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | undefined>();

  function reset() {
    setName("");
    setShortName("");
    setMessage(undefined);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className={cn("gap-2", buttonClassName)} disabled={disabled} type="button" variant="outline">
          <PlusCircle aria-hidden="true" className="size-4" />
          Add Carrier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add carrier</DialogTitle>
          <DialogDescription>Create a carrier record and select it for this intake.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await addCarrierAction({ name, shortName });
              if (!result.ok) {
                setMessage(result.message);
                return;
              }

              onCarrierAdded(result.carrier);
              setMessage(undefined);
              setOpen(false);
              reset();
              router.refresh();
            });
          }}
        >
          <Field required label="Carrier name">
            <Input required value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field help="Optional abbreviation for compact lists and reports." label="Short name">
            <Input value={shortName} onChange={(event) => setShortName(event.target.value)} />
          </Field>
          {message ? <p className="text-sm text-[var(--urgent)]">{message}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button disabled={isPending} type="submit">{isPending ? "Saving..." : "Save carrier"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddCarrierContactDialog({
  buttonClassName,
  buttonLabel = "Add New Carrier Contact",
  carrierId,
  defaultContactType = "adjuster",
  disabled,
  lockedContactType,
  onContactAdded,
}: {
  buttonClassName?: string;
  buttonLabel?: string;
  carrierId: string;
  defaultContactType?: IntakeCarrierContact["contactType"];
  disabled: boolean;
  lockedContactType?: boolean;
  onContactAdded?: (contact: IntakeCarrierContact) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | undefined>();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn("gap-2", buttonClassName)} disabled={disabled} type="button" variant="outline">
          <PlusCircle aria-hidden="true" className="size-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lockedContactType ? "Add adjuster" : "Add carrier contact"}</DialogTitle>
          <DialogDescription>Create a focused contact record for this carrier without leaving intake.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const email = String(form.get("email") ?? "");
            const phone = String(form.get("phone") ?? "");
            const jobTitle = String(form.get("jobTitle") ?? "");
            const department = String(form.get("department") ?? "");
            const contactType = String(form.get("contactType") ?? defaultContactType) as IntakeCarrierContact["contactType"];
            const supervisorContactId = String(form.get("supervisorContactId") ?? "");
            startTransition(async () => {
              const result = await addCarrierContactAction({
                carrierId,
                fullName,
                email,
                phone,
                jobTitle,
                department,
                contactType,
                supervisorContactId,
              });
              setMessage(result.ok ? "Contact saved. The intake options have been refreshed." : result.message);
              if (result.ok) {
                onContactAdded?.({
                  id: result.contactId,
                  carrierId,
                  fullName,
                  email: email || null,
                  phone: phone || null,
                  jobTitle: jobTitle || null,
                  department: department || null,
                  contactType,
                  supervisorContactId: supervisorContactId || null,
                });
                setFullName("");
                setOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <Field label="Name">
            <Input required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email"><Input name="email" type="email" /></Field>
            <Field label="Phone"><Input name="phone" /></Field>
            <Field label="Job title"><Input name="jobTitle" /></Field>
            <Field label="Department"><Input name="department" /></Field>
          </div>
          {lockedContactType ? (
            <input name="contactType" type="hidden" value={defaultContactType} />
          ) : (
            <Field label="Contact type">
              <select className={selectClass()} name="contactType" defaultValue={defaultContactType}>
                <option value="adjuster">Adjuster</option>
                <option value="supervisor">Supervisor</option>
                <option value="claims_manager">Claims manager</option>
                <option value="billing_contact">Billing contact</option>
                <option value="other">Other</option>
              </select>
            </Field>
          )}
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button disabled={isPending} type="submit">{isPending ? "Saving..." : "Save contact"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecoveryDetailsStep(props: {
  data: IntakeFormData;
  errors: Record<string, string>;
  options: IntakeOptions;
  suggestedAmount: string;
  addEvidence: (evidenceType: string) => void;
  removeEvidence: (index: number) => void;
  removeParty: (index: number) => void;
  updateStepTwo: <K extends keyof IntakeFormData["stepTwo"]>(key: K, value: IntakeFormData["stepTwo"][K]) => void;
  updateParty: (index: number, key: string, value: string | boolean) => void;
  updateEvidence: (index: number, key: string, value: string) => void;
  onAddParty: (role: IntakeFormData["stepTwo"]["parties"][number]["role"]) => void;
}) {
  const { data, options, suggestedAmount, addEvidence, removeEvidence, removeParty, updateStepTwo, updateParty, updateEvidence, onAddParty } = props;
  const showCoverage = data.stepTwo.insuranceStatus === "confirmed_coverage" || data.stepTwo.insuranceStatus === "identified_unconfirmed";
  const [evidenceSearch, setEvidenceSearch] = useState("");
  const [selectedEvidenceType, setSelectedEvidenceType] = useState("");
  const [customEvidenceType, setCustomEvidenceType] = useState("");
  const selectedEvidenceTypes = new Set(data.stepTwo.evidence.map((item) => item.evidenceType));
  const availableEvidenceOptions = evidenceTypeOptions.filter((option) => !selectedEvidenceTypes.has(option.value));
  const filteredEvidenceOptions = availableEvidenceOptions.filter((option) => option.label.toLowerCase().includes(evidenceSearch.toLowerCase()));
  const recommendedEvidence = recommendedEvidenceByMatterType[data.stepOne.matterType] ?? [];
  const availableRecommendedEvidence = recommendedEvidence.filter((type) => !selectedEvidenceTypes.has(type));
  const suggestedAmountLabel = suggestedAmount
    ? Number(suggestedAmount) === 0
      ? "Confirmed zero based on entered amounts"
      : `$${suggestedAmount}`
    : "No financial information entered";

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Financial Information</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["amountPaid", "Amount paid by carrier"],
            ["deductible", "Deductible"],
            ["anticipatedAdditionalPayments", "Additional anticipated payments"],
            ["recoverableExpenses", "Recoverable expenses"],
            ["amountSought", "Total amount currently sought"],
            ["estimatedLegalCost", "Estimated legal cost"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                inputMode="decimal"
                min="0"
                placeholder="Unknown"
                step="0.01"
                type="number"
                value={String(data.stepTwo[key as keyof IntakeFormData["stepTwo"]] ?? "")}
                onChange={(event) => updateStepTwo(key as keyof IntakeFormData["stepTwo"], event.target.value as never)}
                onFocus={(event) => event.currentTarget.select()}
              />
            </Field>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-background p-4 text-sm">
          Suggested amount sought: <span className="font-semibold text-foreground">{suggestedAmountLabel}</span>
          {data.stepTwo.amountSoughtManuallyChanged ? (
            <span className="ml-2 text-muted-foreground">Manually adjusted</span>
          ) : null}
          <Button
            className="ml-0 mt-3 sm:ml-3 sm:mt-0"
            disabled={!suggestedAmount}
            type="button"
            variant="outline"
            onClick={() => {
              updateStepTwo("amountSought", suggestedAmount);
              updateStepTwo("amountSoughtManuallyChanged", false);
            }}
          >
            Use suggestion
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Insurance and Liability</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Insurance status">
            <select className={selectClass()} value={data.stepTwo.insuranceStatus} onChange={(event) => updateStepTwo("insuranceStatus", event.target.value as never)}>
              {insuranceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Liability assessment">
            <select className={selectClass()} value={data.stepTwo.liabilityAssessment} onChange={(event) => updateStepTwo("liabilityAssessment", event.target.value as never)}>
              {assessmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Collectability assessment">
            <select className={selectClass()} value={data.stepTwo.collectabilityAssessment} onChange={(event) => updateStepTwo("collectabilityAssessment", event.target.value as never)}>
              {assessmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
        </div>
        {showCoverage ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Adverse insurer"><Input value={data.stepTwo.adverseInsurer ?? ""} onChange={(event) => updateStepTwo("adverseInsurer", event.target.value)} /></Field>
            <Field label="Adverse claim number"><Input value={data.stepTwo.adverseClaimNumber ?? ""} onChange={(event) => updateStepTwo("adverseClaimNumber", event.target.value)} /></Field>
            <Field label="Policy limits"><Input inputMode="decimal" type="number" min="0" value={data.stepTwo.policyLimits ?? ""} onChange={(event) => updateStepTwo("policyLimits", event.target.value)} /></Field>
          </div>
        ) : null}
        <Field label="Brief liability summary">
          <textarea className={textAreaClass()} value={data.stepTwo.liabilitySummary ?? ""} onChange={(event) => updateStepTwo("liabilitySummary", event.target.value)} />
        </Field>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Matter Parties</h3>
            <p className="mt-1 text-sm text-muted-foreground">Identify the insured and responsible party when available.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onAddParty("insured")}>Add Insured</Button>
            <Button type="button" variant="outline" onClick={() => onAddParty("responsible_party")}>Add Responsible Party</Button>
            <Button type="button" variant="outline" onClick={() => onAddParty("adverse_insurer")}>Add Adverse Insurer</Button>
            <Button type="button" variant="outline" onClick={() => onAddParty("other")}>Add Other Party</Button>
          </div>
        </div>
        {data.stepTwo.parties.length === 0 ? (
          <EmptyState description="Parties can be added now or later from the matter detail page." title="No parties added yet" />
        ) : (
          <div className="grid gap-3">
            {data.stepTwo.parties.map((party, index) => (
              <Card className="border-border bg-background" key={party.id}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {partyRoleOptions.find((option) => option.value === party.role)?.label ?? "Matter party"}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {party.mode === "organization" ? "Organization" : "Person/contact"}
                      </p>
                    </div>
                    <Button
                      aria-label={`Remove ${partyRoleOptions.find((option) => option.value === party.role)?.label ?? "party"}`}
                      className="text-muted-foreground hover:text-[var(--urgent)]"
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                      onClick={() => removeParty(index)}
                    >
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Role">
                      <select className={selectClass()} value={party.role} onChange={(event) => updateParty(index, "role", event.target.value)}>
                        {partyRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Party type">
                      <select className={selectClass()} value={party.mode} onChange={(event) => updateParty(index, "mode", event.target.value)}>
                        <option value="contact">Person/contact</option>
                        <option value="organization">Organization</option>
                      </select>
                    </Field>
                    {party.mode === "contact" ? (
                      <>
                        <Field label="Existing contact">
                          <select className={selectClass()} value={party.contactId ?? ""} onChange={(event) => updateParty(index, "contactId", event.target.value)}>
                            <option value="">Create new or select</option>
                            {options.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>)}
                          </select>
                        </Field>
                        <Field label="First name"><Input value={party.firstName ?? ""} onChange={(event) => updateParty(index, "firstName", event.target.value)} /></Field>
                        <Field label="Last name"><Input value={party.lastName ?? ""} onChange={(event) => updateParty(index, "lastName", event.target.value)} /></Field>
                      </>
                    ) : (
                      <>
                        <Field label="Existing organization">
                          <select className={selectClass()} value={party.organizationId ?? ""} onChange={(event) => updateParty(index, "organizationId", event.target.value)}>
                            <option value="">Create new or select</option>
                            {options.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                          </select>
                        </Field>
                        <Field label="Organization name"><Input value={party.organizationName ?? ""} onChange={(event) => updateParty(index, "organizationName", event.target.value)} /></Field>
                      </>
                    )}
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <input checked={party.isPrimary} type="checkbox" onChange={(event) => updateParty(index, "isPrimary", event.target.checked)} />
                      Primary
                    </label>
                    <div className="md:col-span-4">
                      <Field label="Note">
                        <Input value={party.notes ?? ""} onChange={(event) => updateParty(index, "notes", event.target.value)} />
                      </Field>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Evidence Checklist</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add only the evidence items that matter for this recovery.</p>
          </div>
          <div className="grid gap-2 sm:min-w-[360px] sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="sr-only" htmlFor="evidence-search">Search evidence</label>
            <Input
              className="sm:col-span-2"
              id="evidence-search"
              placeholder="Search evidence"
              value={evidenceSearch}
              onChange={(event) => setEvidenceSearch(event.target.value)}
            />
            <label className="sr-only" htmlFor="evidence-type-picker">Evidence item</label>
            <select
              className={selectClass()}
              id="evidence-type-picker"
              value={selectedEvidenceType}
              onChange={(event) => setSelectedEvidenceType(event.target.value)}
            >
              <option value="">Choose evidence to add</option>
              {filteredEvidenceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <Button
              disabled={!selectedEvidenceType}
              type="button"
              variant="outline"
              onClick={() => {
                addEvidence(selectedEvidenceType);
                setSelectedEvidenceType("");
              }}
            >
              Add
            </Button>
            <label className="sr-only" htmlFor="custom-evidence-type">Custom evidence item</label>
            <Input
              id="custom-evidence-type"
              placeholder="Custom evidence item"
              value={customEvidenceType}
              onChange={(event) => setCustomEvidenceType(event.target.value)}
            />
            <Button
              disabled={!customEvidenceType.trim()}
              type="button"
              variant="outline"
              onClick={() => {
                addEvidence(customEvidenceType);
                setCustomEvidenceType("");
              }}
            >
              Add Custom
            </Button>
          </div>
        </div>
        {recommendedEvidence.length > 0 ? (
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Recommended for {matterTypeOptions.find((option) => option.value === data.stepOne.matterType)?.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">Add the items that apply to this matter.</p>
              </div>
              <Button
                disabled={availableRecommendedEvidence.length === 0}
                type="button"
                variant="outline"
                onClick={() => availableRecommendedEvidence.forEach(addEvidence)}
              >
                Add all recommended
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendedEvidence.map((type) => {
                const selected = selectedEvidenceTypes.has(type);
                return (
                  <Button
                    disabled={selected}
                    key={type}
                    size="sm"
                    type="button"
                    variant={selected ? "secondary" : "outline"}
                    onClick={() => addEvidence(type)}
                  >
                    {selected ? "Added" : "Add"} {formatEvidenceType(type)}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
        {data.stepTwo.evidence.length === 0 ? (
          <EmptyState description="Choose standard evidence items or add a custom item when this matter needs one." title="No evidence items selected" />
        ) : (
          <div className="grid gap-3">
            {data.stepTwo.evidence.map((item, index) => (
              <div className="grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)_auto]" key={`${item.evidenceType}-${index}`}>
                <p className="self-center text-sm font-medium text-foreground">{formatEvidenceType(item.evidenceType)}</p>
                <select className={selectClass()} value={item.status} onChange={(event) => updateEvidence(index, "status", event.target.value)}>
                  {evidenceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <Input placeholder="Optional note" value={item.notes ?? ""} onChange={(event) => updateEvidence(index, "notes", event.target.value)} />
                <Button
                  aria-label={`Remove ${formatEvidenceType(item.evidenceType)}`}
                  className="text-muted-foreground hover:text-[var(--urgent)]"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  onClick={() => removeEvidence(index)}
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {data.stepOne.matterType === "health_plan_recovery" ? (
        <MatterSpecificQuestions data={data} updateStepTwo={updateStepTwo} />
      ) : null}
      {data.stepOne.matterType === "insurance_defense" ? (
        <div className="rounded-lg border border-border bg-background p-4">
          <h3 className="text-lg font-semibold text-foreground">Insurance Defense</h3>
          <p className="mt-1 text-sm text-muted-foreground">Initial defense planning fields are stored in matter-specific data on completion.</p>
        </div>
      ) : null}
    </div>
  );
}

function MatterSpecificQuestions({
  data,
  updateStepTwo,
}: {
  data: IntakeFormData;
  updateStepTwo: <K extends keyof IntakeFormData["stepTwo"]>(key: K, value: IntakeFormData["stepTwo"][K]) => void;
}) {
  const fields = [
    "medicareStatus",
    "medicaidStatus",
    "ssdiEligibility",
    "erisaPlanStatus",
    "fundingStatus",
    "masterPlanDocumentReceived",
    "conditionalPaymentStatus",
  ] as const;
  const healthPlan = data.stepTwo.healthPlan ?? {
    medicareStatus: "unknown",
    medicaidStatus: "unknown",
    ssdiEligibility: "unknown",
    erisaPlanStatus: "unknown",
    fundingStatus: "unknown",
    masterPlanDocumentReceived: "unknown",
    conditionalPaymentStatus: "unknown",
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-background p-4">
      <h3 className="text-lg font-semibold text-foreground">Health-plan recovery</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <Field key={field} label={field.replace(/([A-Z])/g, " $1").trim()}>
            <select
              className={selectClass()}
              value={healthPlan[field]}
              onChange={(event) =>
                updateStepTwo("healthPlan", {
                  ...healthPlan,
                  [field]: event.target.value as (typeof yesNoUnknownOptions)[number],
                })
              }
            >
              {yesNoUnknownOptions.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
            </select>
          </Field>
        ))}
      </div>
    </section>
  );
}

function ReviewRouteStep(props: {
  carrierContacts: IntakeCarrierContact[];
  data: IntakeFormData;
  errors: Record<string, string>;
  issueGroups: { required: string[]; followUp: string[] };
  options: IntakeOptions;
  unresolvedIssues: string[];
  update: <K extends keyof IntakeFormData["stepThree"]>(key: K, value: IntakeFormData["stepThree"][K]) => void;
}) {
  const { carrierContacts, data, errors, issueGroups, options, update } = props;
  const canVerify = options.permission.canVerifyDeadline;
  const deadlineMode = data.stepThree.statuteDeadlineUnknownAcknowledged
    ? "unknown"
    : data.stepThree.verifyStatuteDeadline
      ? "verified"
      : "pending";

  function updateDeadlineMode(mode: "pending" | "unknown" | "verified") {
    update("statuteDeadlineUnknownAcknowledged", mode === "unknown");
    update("verifyStatuteDeadline", mode === "verified");
    if (mode === "unknown") update("statuteDeadline", "");
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Deadlines</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field error={errors.statuteDeadline} required help="Entered is not the same as attorney verified." label="Statute-of-limitations deadline">
            <Input className={inputClass(errors.statuteDeadline)} type="date" value={data.stepThree.statuteDeadline ?? ""} onChange={(event) => update("statuteDeadline", event.target.value)} />
          </Field>
          <Field label="Reminder date"><Input type="date" value={data.stepThree.reminderDate ?? ""} onChange={(event) => update("reminderDate", event.target.value)} /></Field>
          <Field label="Person responsible">
            <select className={selectClass()} value={data.stepThree.deadlineAssignedTo ?? ""} onChange={(event) => update("deadlineAssignedTo", event.target.value)}>
              <option value="">Select person</option>
              {options.users.map((user) => <option key={user.id} value={user.id}>{user.fullName} {user.jobTitle ? `- ${user.jobTitle}` : ""}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 rounded-lg border border-border bg-background p-4">
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input checked={deadlineMode === "pending"} name="deadlineStatus" type="radio" onChange={() => updateDeadlineMode("pending")} />
            Deadline entered; attorney verification pending.
          </label>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input checked={deadlineMode === "unknown"} name="deadlineStatus" type="radio" onChange={() => updateDeadlineMode("unknown")} />
            Deadline unknown; immediate review required.
          </label>
          <label className={cn("flex items-start gap-2 text-sm", canVerify ? "text-foreground" : "text-muted-foreground")}>
            <input checked={deadlineMode === "verified"} disabled={!canVerify} name="deadlineStatus" type="radio" onChange={() => updateDeadlineMode("verified")} />
            Deadline attorney verified.
          </label>
          {!canVerify ? <p className="text-sm text-muted-foreground">Staff may enter proposed dates but cannot mark legal deadlines as attorney verified.</p> : null}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Priority and Routing</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field error={errors.priority} required label="Initial priority">
            <select className={selectClass(errors.priority)} value={data.stepThree.priority} onChange={(event) => update("priority", event.target.value as never)}>
              {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Current stage">
            <select className={selectClass()} value={data.stepThree.stage} onChange={(event) => update("stage", event.target.value as never)}>
              {stageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field error={errors.nextAction} required label="Next action">
            <select className={selectClass(errors.nextAction)} value={data.stepThree.nextAction} onChange={(event) => update("nextAction", event.target.value as never)}>
              {nextActionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field error={errors.nextActionDueDate} required label="Next-action due date">
            <Input className={inputClass(errors.nextActionDueDate)} type="date" value={data.stepThree.nextActionDueDate} onChange={(event) => update("nextActionDueDate", event.target.value)} />
          </Field>
          <Field error={errors.nextActionAssignedTo} required label="Assigned person responsible">
            <select className={selectClass(errors.nextActionAssignedTo)} value={data.stepThree.nextActionAssignedTo} onChange={(event) => update("nextActionAssignedTo", event.target.value)}>
              <option value="">Select person</option>
              {options.users.map((user) => <option key={user.id} value={user.id}>{user.fullName} {user.jobTitle ? `- ${user.jobTitle}` : ""}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Internal notes">
          <textarea className={textAreaClass()} value={data.stepThree.internalNotes ?? ""} onChange={(event) => update("internalNotes", event.target.value)} />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Review Summary</h3>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">
            {issueGroups.required.length} required {issueGroups.required.length === 1 ? "item" : "items"} · {issueGroups.followUp.length} follow-up {issueGroups.followUp.length === 1 ? "item" : "items"}
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <IssueList title="Required before completion" issues={issueGroups.required} urgent />
            <IssueList title="Follow up after intake" issues={issueGroups.followUp} />
          </div>
        </div>
        <ReviewSummary carrierContacts={carrierContacts} data={data} options={options} />
      </section>
    </div>
  );
}

function IssueList({ issues, title, urgent }: { issues: string[]; title: string; urgent?: boolean }) {
  return (
    <div>
      <p className={cn("text-sm font-medium", urgent && issues.length > 0 ? "text-[var(--urgent)]" : "text-foreground")}>{title}</p>
      {issues.length > 0 ? (
        <ul className={cn("mt-2 space-y-1 text-sm", urgent ? "text-[var(--urgent)]" : "text-muted-foreground")}>
          {issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">None.</p>
      )}
    </div>
  );
}

function DuplicateWarning({ matches, acknowledged, onAcknowledge }: { matches: DuplicateMatterMatch[]; acknowledged: boolean; onAcknowledge: (value: boolean) => void }) {
  return (
    <div className="mt-5 rounded-lg border border-[color:var(--warning)]/20 bg-[var(--warning-muted)] p-4">
      <p className="text-sm font-semibold text-[var(--warning)]">Possible duplicate matter</p>
      <div className="mt-3 grid gap-2">
        {matches.map((match) => (
          <Link className="text-sm font-medium text-primary hover:underline" href={`/matters/${match.id}`} key={match.id}>
            {match.name} · {match.claimNumber ?? "No claim number"} · {match.status}
          </Link>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-[var(--warning)]">
        <input checked={acknowledged} type="checkbox" onChange={(event) => onAcknowledge(event.target.checked)} />
        I reviewed the possible duplicate and want to continue.
      </label>
    </div>
  );
}

function IntakeSummary(props: {
  data: IntakeFormData;
  options: IntakeOptions;
  selectedCarrier?: { id: string; name: string };
  selectedAdjuster?: IntakeCarrierContact;
  unresolvedIssues: string[];
  hasInteracted: boolean;
}) {
  const { data, selectedCarrier, selectedAdjuster, unresolvedIssues, options, hasInteracted } = props;
  const attorneyLabel = userNames(options.users, normalizeIdList([...(data.stepOne.assignedAttorneyIds ?? []), data.stepOne.assignedAttorneyId]));
  const staffLabel = userNames(options.users, normalizeIdList([...(data.stepOne.assignedStaffIds ?? []), data.stepOne.assignedStaffId]));
  const matterLabel = data.stepOne.matterName || "New matter";
  const issueLabel = !hasInteracted
    ? "Fill in the fields to see a routing summary."
    : unresolvedIssues.length === 0
      ? "No obvious routing issues."
      : `${unresolvedIssues.length} issue${unresolvedIssues.length === 1 ? "" : "s"} to review.`;

  const body = (
    <>
      <dl className="mt-4 space-y-3 text-sm">
        <div><dt className="text-muted-foreground">Matter</dt><dd className="font-medium text-foreground">{data.stepOne.matterName || "Unnamed matter"}</dd></div>
        <div><dt className="text-muted-foreground">Carrier</dt><dd className="font-medium text-foreground">{selectedCarrier?.name ?? "Not selected"}</dd></div>
        <div><dt className="text-muted-foreground">Claim</dt><dd className="font-medium text-foreground">{data.stepOne.carrierClaimNumber || "Not entered"}</dd></div>
        <div><dt className="text-muted-foreground">Adjuster</dt><dd className="font-medium text-foreground">{selectedAdjuster?.fullName ?? "Not assigned"}</dd></div>
        <div><dt className="text-muted-foreground">Attorneys</dt><dd className="font-medium text-foreground">{attorneyLabel}</dd></div>
        <div><dt className="text-muted-foreground">Staff</dt><dd className="font-medium text-foreground">{staffLabel}</dd></div>
        <div><dt className="text-muted-foreground">Amount sought</dt><dd className="font-medium text-foreground">{formatIntakeCurrency(data.stepTwo.amountSought)}</dd></div>
        <div><dt className="text-muted-foreground">Next action</dt><dd className="font-medium text-foreground">{data.stepThree.nextAction}</dd></div>
        {data.stepThree.nextActionDueDate ? <div><dt className="text-muted-foreground">Next-action due</dt><dd className="font-medium text-foreground"><DateDisplay value={data.stepThree.nextActionDueDate} /></dd></div> : null}
      </dl>
      <div className="mt-4 rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">{issueLabel}</div>
    </>
  );

  return (
    <aside className="space-y-4">
      {/* Desktop: always-visible sticky summary */}
      <Card className="hidden border-border bg-card shadow-sm xl:sticky xl:top-6 xl:block xl:self-start">
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold text-foreground">Intake Summary</h2>
          {body}
        </CardContent>
      </Card>

      {/* Mobile and tablet: collapsed by default so it doesn't push the form down */}
      <details className="group rounded-lg border border-border bg-card shadow-sm xl:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-foreground">
          <span>
            Intake Summary <span className="font-normal text-muted-foreground">· {matterLabel}</span>
          </span>
          <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="px-4 pb-4">{body}</div>
      </details>
    </aside>
  );
}

function ReviewSummary({ carrierContacts, data, options }: { carrierContacts: IntakeCarrierContact[]; data: IntakeFormData; options: IntakeOptions }) {
  const carrier = options.carriers.find((item) => item.id === data.stepOne.carrierId);
  const adjuster = carrierContacts.find((item) => item.id === data.stepOne.assignedAdjusterId);
  const attorneyLabel = userNames(options.users, normalizeIdList([...(data.stepOne.assignedAttorneyIds ?? []), data.stepOne.assignedAttorneyId]));
  const staffLabel = userNames(options.users, normalizeIdList([...(data.stepOne.assignedStaffIds ?? []), data.stepOne.assignedStaffId]));
  const received = data.stepTwo.evidence.filter((item) => item.status === "received");
  const needed = data.stepTwo.evidence.filter((item) => item.status === "missing" || item.status === "requested");

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-4 text-sm md:grid-cols-2">
      <p><span className="text-muted-foreground">Matter:</span> {data.stepOne.matterName}</p>
      <p><span className="text-muted-foreground">Carrier:</span> {carrier?.name ?? "Not selected"}</p>
      <p><span className="text-muted-foreground">Claim:</span> {data.stepOne.carrierClaimNumber}</p>
      <p><span className="text-muted-foreground">Adjuster:</span> {adjuster?.fullName ?? "Not assigned"}</p>
      <p><span className="text-muted-foreground">Attorneys:</span> {attorneyLabel}</p>
      <p><span className="text-muted-foreground">Staff:</span> {staffLabel}</p>
      <p><span className="text-muted-foreground">Matter type:</span> {formatEvidenceType(data.stepOne.matterType)}</p>
      <p><span className="text-muted-foreground">Amount paid:</span> {formatIntakeCurrency(data.stepTwo.amountPaid)}</p>
      <p><span className="text-muted-foreground">Amount sought:</span> {formatIntakeCurrency(data.stepTwo.amountSought)}</p>
      <p><span className="text-muted-foreground">Insurance:</span> {data.stepTwo.insuranceStatus.replaceAll("_", " ")}</p>
      <p><span className="text-muted-foreground">Liability:</span> {data.stepTwo.liabilityAssessment}</p>
      <p><span className="text-muted-foreground">Collectability:</span> {data.stepTwo.collectabilityAssessment}</p>
      <p><span className="text-muted-foreground">Parties:</span> {data.stepTwo.parties.length}</p>
      <p><span className="text-muted-foreground">Evidence received:</span> {received.length}</p>
      <p><span className="text-muted-foreground">Evidence needed:</span> {needed.length}</p>
      <p><span className="text-muted-foreground">Statute deadline:</span> {data.stepThree.statuteDeadline || "Requires review"}</p>
      <p><span className="text-muted-foreground">Deadline verification:</span> {data.stepThree.verifyStatuteDeadline ? "Attorney verified" : "Unverified"}</p>
    </div>
  );
}

function formatIntakeCurrency(value: string) {
  if (value.trim() === "") return "Unknown";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "Unknown";
  return <CurrencyDisplay value={parsed} />;
}

function flattenStepErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Check this field."])
  );
}

function focusFirstInvalid() {
  window.requestAnimationFrame(() => {
    const invalid = document.querySelector("[aria-invalid='true'], .border-\\[color\\:var\\(--urgent\\)\\]");
    if (invalid instanceof HTMLElement) invalid.focus();
  });
}
