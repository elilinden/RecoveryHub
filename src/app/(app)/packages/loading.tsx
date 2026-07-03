import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function PackagesLoading() {
  return (
    <div className="space-y-6">
      <PageHeader subtitle="Loading package queue." title="Packages" />
      <LoadingSkeleton rows={6} />
    </div>
  );
}
