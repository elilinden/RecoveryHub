import { PackageCheck } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { PackagesWorkspace } from "@/components/documents-packages/packages-workspace";
import { requireActiveProfile } from "@/lib/auth/session";
import { loadPackagesWorkspace } from "@/lib/documents-packages/data";

type PackagesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PackagesPage({ searchParams }: PackagesPageProps) {
  const params = (await searchParams) ?? {};
  const { profile } = await requireActiveProfile();
  const result = await loadPackagesWorkspace({ profile, searchParams: params });

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        subtitle="Prepare, validate, review, and approve outbound packages for the later send workflow."
        title="Packages"
        actions={
          <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground shadow-sm">
            <PackageCheck aria-hidden="true" className="size-4 text-primary" />
            No email delivery in this phase
          </div>
        }
      />
      <PackagesWorkspace result={result} />
    </div>
  );
}
