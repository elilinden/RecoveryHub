import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { NewMatterIntake } from "@/components/intake/new-matter-intake";
import { Button } from "@/components/ui/button";
import { getIntakeOptions } from "@/lib/intake/options";

export default async function AddMatterPage() {
  const options = await getIntakeOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="Collect referral details, recovery information, deadline status, and the first routed action."
        title="New Matter Intake"
      />

      {options.permission.canCreateMatter ? (
        <NewMatterIntake options={options} />
      ) : (
        <EmptyState
          action={
            <Button asChild variant="outline">
              <Link href="/matters">Back to matters</Link>
            </Button>
          }
          description="Your current role can review matters but cannot create new intake records."
          title="Matter creation is unavailable"
        />
      )}
    </div>
  );
}
