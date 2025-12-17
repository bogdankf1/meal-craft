import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportContent } from "./export-content";

function ExportLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}

export default async function ExportPage() {
  const t = await getTranslations("export");

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <Suspense fallback={<ExportLoadingSkeleton />}>
        <ExportContent />
      </Suspense>
    </div>
  );
}
