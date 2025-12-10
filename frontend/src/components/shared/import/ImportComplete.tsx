"use client";

import { useTranslations } from "next-intl";
import { CheckCircle, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useImportWizard } from "./ImportWizard";

interface ImportCompleteProps {
  itemCount: number;
  onAddMore?: () => void;
  onViewItems?: () => void;
  translationNamespace?: string;
}

export function ImportComplete({
  itemCount,
  onAddMore,
  onViewItems,
  translationNamespace = "import",
}: ImportCompleteProps) {
  const t = useTranslations(translationNamespace);
  const { reset } = useImportWizard();

  const handleAddMore = () => {
    reset();
    onAddMore?.();
  };

  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>

          <div>
            <h3 className="text-xl font-semibold">
              {t("complete.title")}
            </h3>
            <p className="text-muted-foreground mt-1">
              {t("complete.description", { count: itemCount })}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" onClick={handleAddMore}>
              <Plus className="h-4 w-4 mr-2" />
              {t("complete.addMore")}
            </Button>
            {onViewItems && (
              <Button onClick={onViewItems}>
                {t("complete.viewItems")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
