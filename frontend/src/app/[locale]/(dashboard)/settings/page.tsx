import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";

export default async function SettingsPage() {
  const t = await getTranslations("nav");

  return (
    <div>
      <PageHeader title={t("settings")} description="Manage your account and preferences." />
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        This module will be implemented in Phase 2+
      </div>
    </div>
  );
}
