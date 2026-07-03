"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Clock3, PlusCircle, Save } from "lucide-react";

import { CurrencyDisplay } from "@/components/common/currency-display";
import { DateDisplay } from "@/components/common/date-display";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
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
  evidenceStatusOptions,
  insuranceStatusOptions,
  matterTypeOptions,
  nextActionOptions,
  partyRoleOptions,
  priorityOptions,
  stageOptions,
  validateIntakeStep,
  yesNoUnknownOptions,
  type IntakeFormData,
} from "@/lib/intake/schema";
import { filterContactsByCarrier, type IntakeCarrierContact, type IntakeOptions } from "@/lib/intake/types";
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

function statusLabel(status: SaveState, lastSavedAt?: string) {
  if (status === "saving") return "Saving...";
  if (status === "error") return "Unable to save";
  if (status === "saved" && lastSavedAt) return `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return "Not saved yet";
}

function getInitialIntakeData(initialData?: IntakeFormData | null) {
  if (initialData) return initialData;
  if (typeof window === "undefined") return createEmptyIntake();

  const saved = window.localStorage.getItem(localStorageKey);
  if (!saved) return createEmptyIntake();

  try {
    return JSON.parse(saved) as IntakeFormData;
  } catch {
    window.localStorage.removeItem(localStorageKey);
    return createEmptyIntake();
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
  const pendingAutosave = useRef(false);

  const selectedCarrier = options.carriers.find((carrier) => carrier.id === data.stepOne.carrierId);
  const adjusters = useMemo(
    () => filterContactsByCarrier(options.carrierContacts, data.stepOne.carrierId, "adjuster"),
    [options.carrierContacts, data.stepOne.carrierId]
  );
  const supervisors = useMemo(
    () => options.carrierContacts.filter((contact) => contact.carrierId === data.stepOne.carrierId && contact.contactType !== "adjuster"),
    [options.carrierContacts, data.stepOne.carrierId]
  );
  const assignedAdjuster = options.carrierContacts.find((contact) => contact.id === data.stepOne.assignedAdjusterId);
  const suggestedAmount = calculateSuggestedAmountSought(data.stepTwo);
  const unresolvedIssues = getUnresolvedIssues(data);

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

  async function cancelIntake() {
    const result = await cancelIntakeAction(matterId || undefined);
    if (result.ok && result.redirectTo) {
      window.localStorage.removeItem(localStorageKey);
      router.push(result.redirectTo);
    } else if (!result.ok) {
      setMessage(result.message);
    }
  }

  function addParty(mode: "contact" | "organization") {
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
            role: mode === "organization" ? "responsible_party" : "insured",
            isPrimary: current.stepTwo.parties.length === 0,
            notes: "",
          },
        ],
      },
    }));
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
                    options={options}
                    selectedAdjuster={assignedAdjuster}
                    selectedCarrier={selectedCarrier}
                    supervisors={supervisors}
                    update={updateStepOne}
                  />
                ) : null}
                {step === 2 ? (
                  <RecoveryDetailsStep
                    data={data}
                    errors={fieldErrors}
                    options={options}
                    suggestedAmount={suggestedAmount}
                    updateEvidence={updateEvidence}
                    updateParty={updateParty}
                    updateStepTwo={updateStepTwo}
                    onAddParty={addParty}
                  />
                ) : null}
                {step === 3 ? (
                  <ReviewRouteStep
                    data={data}
                    errors={fieldErrors}
                    options={options}
                    unresolvedIssues={hasInteracted ? unresolvedIssues : []}
                    update={updateStepThree}
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
                      The draft will be preserved and archived when possible. It will not be permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
                      Keep editing
                    </Button>
                    <Button type="button" onClick={cancelIntake}>
                      Preserve draft and exit
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
                <Button disabled={isPending || !options.permission.canCreateMatter} type="button" onClick={completeIntake}>
                  Complete Intake
                </Button>
              )}
            </div>
          </div>
        </div>

        <IntakeSummary
          data={data}
          hasInteracted={hasInteracted}
          options={options}
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
  update: <K extends keyof IntakeFormData["stepOne"]>(key: K, value: IntakeFormData["stepOne"][K]) => void;
}) {
  const { data, errors, options, selectedAdjuster, adjusters, supervisors, update } = props;
  const attorneys = options.users.filter((user) => ["admin", "partner", "attorney"].includes(user.role));
  const staff = options.users.filter((user) => user.role === "staff");
  const partners = options.users.filter((user) => user.role === "partner");
  const responsibleUsers = options.users.filter((user) => ["admin", "partner", "attorney", "staff"].includes(user.role));

  return (
    <div className="space-y-8">
      {options.carriers.length === 0 ? (
        <EmptyState description="Add an active carrier before starting intake." title="No active carriers" />
      ) : null}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Referral Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field error={errors.carrierId} required label="Carrier">
            <select className={selectClass(errors.carrierId)} value={data.stepOne.carrierId} onChange={(event) => update("carrierId", event.target.value)}>
              <option value="">Select carrier</option>
              {options.carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </Field>
          <Field error={errors.carrierClaimNumber} required label="Carrier claim number">
            <Input className={inputClass(errors.carrierClaimNumber)} value={data.stepOne.carrierClaimNumber} onChange={(event) => update("carrierClaimNumber", event.target.value)} />
          </Field>
          <Field label="Firm matter number">
            <Input className={inputClass()} value={data.stepOne.firmMatterNumber ?? ""} onChange={(event) => update("firmMatterNumber", event.target.value)} />
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
          <Field label="Date of loss">
            <Input className={inputClass()} type="date" value={data.stepOne.dateOfLoss ?? ""} onChange={(event) => update("dateOfLoss", event.target.value)} />
          </Field>
          <Field label="Jurisdiction">
            <Input className={inputClass()} value={data.stepOne.jurisdiction ?? ""} onChange={(event) => update("jurisdiction", event.target.value)} />
          </Field>
          <Field label="Venue">
            <Input className={inputClass()} value={data.stepOne.venue ?? ""} onChange={(event) => update("venue", event.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-foreground">Carrier Assignment</h3>
          <AddCarrierContactDialog disabled={!data.stepOne.carrierId || !options.permission.canAddCarrierContact} carrierId={data.stepOne.carrierId} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            help={data.stepOne.carrierId && adjusters.length === 0 ? "No active adjusters are listed for this carrier. Add a carrier contact or continue without one." : undefined}
            label="Assigned adjuster"
          >
            <select className={selectClass()} value={data.stepOne.assignedAdjusterId ?? ""} onChange={(event) => update("assignedAdjusterId", event.target.value)}>
              <option value="">Select adjuster</option>
              {adjusters.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.fullName} {contact.jobTitle ? `- ${contact.jobTitle}` : ""}
                </option>
              ))}
            </select>
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
        </div>
        {selectedAdjuster ? (
          <div className="rounded-lg border border-border bg-background p-4 text-sm">
            <p className="font-medium text-foreground">{selectedAdjuster.fullName}</p>
            <p className="mt-1 text-muted-foreground">
              {[selectedAdjuster.jobTitle, selectedAdjuster.department, selectedAdjuster.email, selectedAdjuster.phone]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Firm Assignment</h3>
        {responsibleUsers.length === 0 ? <EmptyState description="No eligible active users are available for assignment." title="No eligible assignees" /> : null}
        <div className="grid gap-4 md:grid-cols-3">
          <Field error={errors.assignedAttorneyId} required label="Assigned attorney">
            <select className={selectClass(errors.assignedAttorneyId)} value={data.stepOne.assignedAttorneyId ?? ""} onChange={(event) => update("assignedAttorneyId", event.target.value)}>
              <option value="">Select attorney</option>
              {attorneys.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} {user.jobTitle ? `- ${user.jobTitle}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigned staff member">
            <select className={selectClass()} value={data.stepOne.assignedStaffId ?? ""} onChange={(event) => update("assignedStaffId", event.target.value)}>
              <option value="">Optional staff</option>
              {staff.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} {user.jobTitle ? `- ${user.jobTitle}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Supervising partner">
            <select className={selectClass()} value={data.stepOne.supervisingPartnerId ?? ""} onChange={(event) => update("supervisingPartnerId", event.target.value)}>
              <option value="">Optional partner</option>
              {partners.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>
    </div>
  );
}

function AddCarrierContactDialog({ carrierId, disabled }: { carrierId: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | undefined>();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={disabled} type="button" variant="outline">
          <PlusCircle aria-hidden="true" className="size-4" />
          Add New Carrier Contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add carrier contact</DialogTitle>
          <DialogDescription>Create a focused contact record for this carrier without leaving intake.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await addCarrierContactAction({
                carrierId,
                fullName,
                email: String(form.get("email") ?? ""),
                phone: String(form.get("phone") ?? ""),
                jobTitle: String(form.get("jobTitle") ?? ""),
                department: String(form.get("department") ?? ""),
                contactType: String(form.get("contactType") ?? "adjuster"),
                supervisorContactId: String(form.get("supervisorContactId") ?? ""),
              });
              setMessage(result.ok ? "Contact saved. The intake options have been refreshed." : result.message);
              if (result.ok) {
                setFullName("");
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
          <Field label="Contact type">
            <select className={selectClass()} name="contactType" defaultValue="adjuster">
              <option value="adjuster">Adjuster</option>
              <option value="supervisor">Supervisor</option>
              <option value="claims_manager">Claims manager</option>
              <option value="billing_contact">Billing contact</option>
              <option value="other">Other</option>
            </select>
          </Field>
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
  updateStepTwo: <K extends keyof IntakeFormData["stepTwo"]>(key: K, value: IntakeFormData["stepTwo"][K]) => void;
  updateParty: (index: number, key: string, value: string | boolean) => void;
  updateEvidence: (index: number, key: string, value: string) => void;
  onAddParty: (mode: "contact" | "organization") => void;
}) {
  const { data, options, suggestedAmount, updateStepTwo, updateParty, updateEvidence, onAddParty } = props;
  const showCoverage = data.stepTwo.insuranceStatus === "confirmed_coverage" || data.stepTwo.insuranceStatus === "identified_unconfirmed";

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
          Suggested amount sought: <span className="font-semibold text-foreground">${suggestedAmount}</span>
          {data.stepTwo.amountSoughtManuallyChanged ? (
            <span className="ml-2 text-muted-foreground">Manually adjusted</span>
          ) : null}
          <Button
            className="ml-0 mt-3 sm:ml-3 sm:mt-0"
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
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onAddParty("contact")}>Add contact party</Button>
            <Button type="button" variant="outline" onClick={() => onAddParty("organization")}>Add organization party</Button>
          </div>
        </div>
        {data.stepTwo.parties.length === 0 ? (
          <EmptyState description="Parties can be added now or later from the matter detail page." title="No parties added yet" />
        ) : (
          <div className="grid gap-3">
            {data.stepTwo.parties.map((party, index) => (
              <Card className="border-border bg-background" key={party.id}>
                <CardContent className="grid gap-4 p-4 md:grid-cols-4">
                  <Field label="Role">
                    <select className={selectClass()} value={party.role} onChange={(event) => updateParty(index, "role", event.target.value)}>
                      {partyRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Evidence Checklist</h3>
        <div className="grid gap-3">
          {data.stepTwo.evidence.map((item, index) => (
            <div className="grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-[1fr_180px_1fr]" key={item.evidenceType}>
              <p className="text-sm font-medium text-foreground">{item.evidenceType.replaceAll("_", " ")}</p>
              <select className={selectClass()} value={item.status} onChange={(event) => updateEvidence(index, "status", event.target.value)}>
                {evidenceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <Input placeholder="Optional note" value={item.notes ?? ""} onChange={(event) => updateEvidence(index, "notes", event.target.value)} />
            </div>
          ))}
        </div>
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
  data: IntakeFormData;
  errors: Record<string, string>;
  options: IntakeOptions;
  unresolvedIssues: string[];
  update: <K extends keyof IntakeFormData["stepThree"]>(key: K, value: IntakeFormData["stepThree"][K]) => void;
}) {
  const { data, errors, options, unresolvedIssues, update } = props;
  const canVerify = options.permission.canVerifyDeadline;

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
            <input checked={data.stepThree.statuteDeadlineUnknownAcknowledged} type="checkbox" onChange={(event) => update("statuteDeadlineUnknownAcknowledged", event.target.checked)} />
            The statute deadline is not yet known and requires immediate review.
          </label>
          <label className={cn("flex items-start gap-2 text-sm", canVerify ? "text-foreground" : "text-muted-foreground")}>
            <input checked={data.stepThree.verifyStatuteDeadline} disabled={!canVerify} type="checkbox" onChange={(event) => update("verifyStatuteDeadline", event.target.checked)} />
            Mark statute deadline as attorney verified.
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
        {unresolvedIssues.length > 0 ? (
          <div className="rounded-lg border border-[color:var(--warning)]/20 bg-[var(--warning-muted)] p-4">
            <p className="text-sm font-semibold text-[var(--warning)]">Unresolved issues</p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--warning)]">
              {unresolvedIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </div>
        ) : null}
        <ReviewSummary data={data} options={options} />
      </section>
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
  const attorney = options.users.find((user) => user.id === data.stepOne.assignedAttorneyId);
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
        <div><dt className="text-muted-foreground">Attorney</dt><dd className="font-medium text-foreground">{attorney?.fullName ?? "Not assigned"}</dd></div>
        <div><dt className="text-muted-foreground">Amount sought</dt><dd className="font-medium text-foreground"><CurrencyDisplay value={Number(data.stepTwo.amountSought || 0)} /></dd></div>
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

function ReviewSummary({ data, options }: { data: IntakeFormData; options: IntakeOptions }) {
  const carrier = options.carriers.find((item) => item.id === data.stepOne.carrierId);
  const adjuster = options.carrierContacts.find((item) => item.id === data.stepOne.assignedAdjusterId);
  const attorney = options.users.find((item) => item.id === data.stepOne.assignedAttorneyId);
  const received = data.stepTwo.evidence.filter((item) => item.status === "received");
  const needed = data.stepTwo.evidence.filter((item) => item.status === "missing" || item.status === "requested");

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-4 text-sm md:grid-cols-2">
      <p><span className="text-muted-foreground">Matter:</span> {data.stepOne.matterName}</p>
      <p><span className="text-muted-foreground">Carrier:</span> {carrier?.name ?? "Not selected"}</p>
      <p><span className="text-muted-foreground">Claim:</span> {data.stepOne.carrierClaimNumber}</p>
      <p><span className="text-muted-foreground">Adjuster:</span> {adjuster?.fullName ?? "Not assigned"}</p>
      <p><span className="text-muted-foreground">Attorney:</span> {attorney?.fullName ?? "Not assigned"}</p>
      <p><span className="text-muted-foreground">Matter type:</span> {data.stepOne.matterType.replaceAll("_", " ")}</p>
      <p><span className="text-muted-foreground">Amount paid:</span> ${data.stepTwo.amountPaid}</p>
      <p><span className="text-muted-foreground">Amount sought:</span> ${data.stepTwo.amountSought}</p>
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

function getUnresolvedIssues(data: IntakeFormData) {
  const issues: string[] = [];
  if (!data.stepOne.assignedAdjusterId) issues.push("No assigned adjuster.");
  if (!data.stepTwo.parties.some((party) => party.role === "responsible_party")) issues.push("Missing responsible party.");
  if (data.stepTwo.insuranceStatus === "unknown") issues.push("Insurance status is unknown.");
  if (!data.stepThree.statuteDeadline) issues.push("No statute deadline entered.");
  if (data.stepThree.statuteDeadline && !data.stepThree.verifyStatuteDeadline) issues.push("Statute deadline is unverified.");
  if (!data.stepThree.nextAction) issues.push("No next action selected.");
  if (!data.stepThree.nextActionDueDate) issues.push("Missing next-action due date.");
  if (!data.stepTwo.evidence.some((item) => item.evidenceType === "payment_ledger" && item.status === "received")) issues.push("Payment documentation is not marked received.");
  return issues;
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
