"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function AdminSupportPage() {
  const t = useTranslations("admin");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("support.title")}
        description={t("support.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("support.placeholder.title")}
          </CardTitle>
          <CardDescription>
            {t("support.placeholder.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">
              {t("support.placeholder.message")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("support.placeholder.comingSoon")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
