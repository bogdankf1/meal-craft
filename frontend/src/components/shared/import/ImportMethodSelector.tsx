"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useImportWizard, ImportMethod } from "./ImportWizard";

interface ImportMethodSelectorProps {
  methods: ImportMethod[];
  translationNamespace?: string;
}

export function ImportMethodSelector({
  methods,
  translationNamespace = "import",
}: ImportMethodSelectorProps) {
  const t = useTranslations(translationNamespace);
  const tCommon = useTranslations("common");
  const { setSelectedMethod, setStep } = useImportWizard();

  const handleMethodSelect = (method: ImportMethod) => {
    if (method.disabled || method.comingSoon) return;
    setSelectedMethod(method.id);
    setStep("input");
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">{t("selectMethod.title")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("selectMethod.description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((method) => (
          <Card
            key={method.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              method.disabled || method.comingSoon
                ? "opacity-60 cursor-not-allowed"
                : "hover:border-primary"
            )}
            onClick={() => handleMethodSelect(method)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  {method.icon}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <h4 className="font-medium">{t(method.titleKey)}</h4>
                    {method.comingSoon && (
                      <Badge variant="secondary" className="text-xs">
                        {tCommon("comingSoon")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(method.descriptionKey)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
