import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { SeasonalityContent } from "./seasonality-content";

function SeasonalityLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      {/* Content skeleton */}
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

export default async function SeasonalityPage() {
  const t = await getTranslations("seasonality");

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <Suspense fallback={<SeasonalityLoadingSkeleton />}>
        <SeasonalityContent />
      </Suspense>
    </div>
  );
}
