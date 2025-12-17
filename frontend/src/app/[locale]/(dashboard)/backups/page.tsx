import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { BackupsContent } from "./backups-content";

function BackupsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}

export default async function BackupsPage() {
  const t = await getTranslations("backups");

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <Suspense fallback={<BackupsLoadingSkeleton />}>
        <BackupsContent />
      </Suspense>
    </div>
  );
}
