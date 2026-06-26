"use client";

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

  // Separate primary and secondary methods
  const primaryMethods = methods.filter((m) => m.primary);
  const secondaryMethods = methods.filter((m) => !m.primary);
  const hasPrimaryMethods = primaryMethods.length > 0;

  const renderPrimaryCard = (method: ImportMethod) => (
    <Card
      key={method.id}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-primary/50 bg-primary/5",
        method.disabled || method.comingSoon
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-primary hover:bg-primary/10"
      )}
      onClick={() => handleMethodSelect(method)}
    >
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="rounded-full bg-primary/10 text-primary p-4">
            <div className="[&>svg]:h-8 [&>svg]:w-8">{method.icon}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h4 className="font-medium text-lg">{t(method.titleKey)}</h4>
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
  );

  const renderSecondaryCard = (method: ImportMethod) => (
    <Card
      key={method.id}
      className={cn(
        "cursor-pointer transition-all hover:shadow-sm",
        method.disabled || method.comingSoon
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-primary/50"
      )}
      onClick={() => handleMethodSelect(method)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted text-muted-foreground p-2 flex-shrink-0">
            <div className="[&>svg]:h-4 [&>svg]:w-4">{method.icon}</div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-medium text-sm truncate">{t(method.titleKey)}</h4>
              {method.comingSoon && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  {tCommon("comingSoon")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {t(method.descriptionKey)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">{t("selectMethod.title")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("selectMethod.description")}
        </p>
      </div>

      {/* Primary methods - larger, more prominent */}
      {hasPrimaryMethods && (
        <div
          className={cn(
            "grid gap-4",
            primaryMethods.length === 1 && "max-w-md mx-auto",
            primaryMethods.length === 2 && "sm:grid-cols-2 max-w-2xl mx-auto",
            primaryMethods.length >= 3 && "sm:grid-cols-2 lg:grid-cols-3"
          )}
          data-spotlight="import-methods-primary"
        >
          {primaryMethods.map((method) => renderPrimaryCard(method))}
        </div>
      )}

      {/* Secondary methods - compact horizontal layout */}
      {secondaryMethods.length > 0 && (
        <div className="space-y-2">
          {hasPrimaryMethods && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              {t("selectMethod.otherOptions")}
            </p>
          )}
          <div
            className={cn(
              "grid gap-2",
              hasPrimaryMethods
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto"
                : "sm:grid-cols-2 lg:grid-cols-3 gap-4"
            )}
            data-spotlight="import-methods"
          >
            {secondaryMethods.map((method) =>
              hasPrimaryMethods ? renderSecondaryCard(method) : renderPrimaryCard(method)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
