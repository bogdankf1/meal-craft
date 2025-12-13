import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { LearningContent } from "./learning-content";

function LearningLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      {/* Content skeleton */}
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

export default async function LearningPage() {
  const t = await getTranslations("learning");

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <Suspense fallback={<LearningLoadingSkeleton />}>
        <LearningContent />
      </Suspense>
    </div>
  );
}
