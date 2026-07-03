import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function MattersLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 rounded-md bg-secondary" />
        <div className="mt-3 h-5 w-96 max-w-full rounded-md bg-secondary" />
      </div>
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <LoadingSkeleton rows={3} />
        </CardContent>
      </Card>
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-4">
          <LoadingSkeleton rows={8} />
        </CardContent>
      </Card>
    </div>
  );
}
