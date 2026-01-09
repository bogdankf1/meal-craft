import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { KitchenEquipmentContent } from "./kitchen-equipment-content";

function KitchenEquipmentLoadingSkeleton() {
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

export default async function KitchenEquipmentPage() {
  const t = await getTranslations("kitchenEquipment");

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <Suspense fallback={<KitchenEquipmentLoadingSkeleton />}>
        <KitchenEquipmentContent />
      </Suspense>
    </div>
  );
}
