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
  descriptionKey?: string;
  viewItemsKey?: string;
}

export function ImportComplete({
  itemCount,
  onAddMore,
  onViewItems,
  translationNamespace = "import",
  descriptionKey = "complete.description",
  viewItemsKey = "complete.viewItems",
}: ImportCompleteProps) {
  const t = useTranslations(translationNamespace);
  const { reset } = useImportWizard();

  const handleAddMore = () => {
    reset();
    onAddMore?.();
  };

  return (
    <Card className="border-0 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-[1.375rem]">
      <CardContent className="py-10">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--green-ghost)] dark:bg-green-900/30">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>

          <div>
            <h3 className="text-[15px] font-medium">
              {t("complete.title")}
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              {t(descriptionKey, { count: itemCount })}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
            <Button variant="outline" className="rounded-xl" onClick={handleAddMore}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("complete.addMore")}
            </Button>
            {onViewItems && (
              <Button className="rounded-xl" onClick={onViewItems}>
                {t(viewItemsKey)}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
