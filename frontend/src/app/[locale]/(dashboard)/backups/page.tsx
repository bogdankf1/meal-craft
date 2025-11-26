import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";

export default async function BackupsPage() {
  const t = await getTranslations("nav");

  return (
    <div>
      <PageHeader title={t("backups")} description="Manage your data backups and restores." />
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        This module will be implemented in Phase 2+
      </div>
    </div>
  );
}
