import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Loading today summary">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-14 w-full rounded-lg" key={index} />
        ))}
      </section>
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-8 w-full max-w-md" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-16 w-full" key={index} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
