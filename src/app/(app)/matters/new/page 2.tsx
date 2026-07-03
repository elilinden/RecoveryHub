import { Info } from "lucide-react";

import { FormFieldWrapper } from "@/components/common/form-field-wrapper";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const steps = ["Matter Details", "Recovery Details", "Review and Route"];

export default function AddMatterPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="The intake flow will collect referral facts, recovery details, and routing decisions in a later phase."
        title="Add Matter"
      />

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-5">
          <ol className="grid gap-3 md:grid-cols-3" aria-label="Matter intake progress">
            {steps.map((step, index) => (
              <li className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3" key={step}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="flex gap-3 rounded-lg border border-primary/15 bg-[var(--info-muted)] p-4 text-primary">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <p className="text-sm leading-6">
              Functional intake, validation, assignment rules, and persistence will be added in a later phase.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormFieldWrapper label="Matter name" description="Reserved for the future intake form.">
              <Input disabled placeholder="Example: Carrier v. Responsible party" />
            </FormFieldWrapper>
            <FormFieldWrapper label="Carrier" description="Reserved for carrier and claim metadata.">
              <Input disabled placeholder="Insurance carrier" />
            </FormFieldWrapper>
            <FormFieldWrapper label="Claim number">
              <Input disabled placeholder="Claim reference" />
            </FormFieldWrapper>
            <FormFieldWrapper label="Amount sought">
              <Input disabled placeholder="$0" />
            </FormFieldWrapper>
          </div>

          <div className="rounded-lg border border-dashed border-border bg-background p-5">
            <p className="mb-4 text-sm font-medium text-foreground">Future routing preview</p>
            <LoadingSkeleton rows={3} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
