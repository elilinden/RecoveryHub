import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AssessmentLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-96" />
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card className="border-border bg-card shadow-sm" key={index}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-4 p-5">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton className="h-24 w-full" key={index} />)}
        </CardContent>
      </Card>
    </div>
  );
}
