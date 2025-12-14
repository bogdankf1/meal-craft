import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsContent } from "./settings-content";

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-96" />
      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<SettingsLoadingSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
