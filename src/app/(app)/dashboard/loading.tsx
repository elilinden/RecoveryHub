import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Loading matter summary">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card className="border-border bg-card shadow-sm" key={index}>
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-6 w-52" />
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-14 w-full" key={index} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
