import { PageHeader } from "@/components/common/page-header";
import { DeliveryNotEnabledNotice } from "@/components/documents-packages/delivery-not-enabled-notice";
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
      <PageHeader subtitle="Prepare, validate, review, and approve outbound packages for the later send workflow." title="Packages" />
      <DeliveryNotEnabledNotice />
      <PackagesWorkspace result={result} />
    </div>
  );
}
