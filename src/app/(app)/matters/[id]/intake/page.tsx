import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { NewMatterIntake } from "@/components/intake/new-matter-intake";
import { Button } from "@/components/ui/button";
import { getIntakeDraft } from "@/lib/intake/actions";
import { getIntakeOptions } from "@/lib/intake/options";
import { createEmptyIntake } from "@/lib/intake/schema";

type ResumeIntakePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ResumeIntakePage({ params }: ResumeIntakePageProps) {
  const { id } = await params;
  const [options, draft] = await Promise.all([getIntakeOptions(), getIntakeDraft(id)]);

  const initialData = draft ?? { ...createEmptyIntake(), id };

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="Continue a saved intake draft and complete routing when the referral is ready."
        title="Resume Intake"
      />

      {options.permission.canCreateMatter ? (
        <NewMatterIntake initialData={initialData} matterId={id} options={options} />
      ) : (
        <EmptyState
          action={
            <Button asChild variant="outline">
              <Link href="/matters">Back to matters</Link>
            </Button>
          }
          description="Your current role can review matters but cannot resume intake drafts."
          title="Intake editing is unavailable"
        />
      )}
    </div>
  );
}
