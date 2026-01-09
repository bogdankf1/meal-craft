import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { GroceriesContent } from "./groceries-content";

function GroceriesLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      {/* Table skeleton */}
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

export default async function GroceriesPage() {
  const t = await getTranslations("groceries");

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <Suspense fallback={<GroceriesLoadingSkeleton />}>
        <GroceriesContent />
      </Suspense>
    </div>
  );
}
