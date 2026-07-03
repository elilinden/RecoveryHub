import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function MatterDetailLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-80 max-w-full rounded-md bg-secondary" />
        <div className="mt-3 h-5 w-96 max-w-full rounded-md bg-secondary" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Card className="border-border bg-card shadow-sm" key={index}>
            <CardContent className="p-5">
              <LoadingSkeleton rows={2} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <LoadingSkeleton rows={8} />
        </CardContent>
      </Card>
    </div>
  );
}
