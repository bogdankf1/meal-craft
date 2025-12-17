"use client";

import { useState } from "react";
import { Download, FileDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useDownloadExportMutation,
  type EntryType,
  type ExportFormat,
  type ExportRequest,
} from "@/lib/api/exports-api";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useTranslations } from "next-intl";

export function ExportContent() {
  const t = useTranslations("export");

  const ENTRY_TYPES: { value: EntryType; label: string }[] = [
    { value: "groceries", label: t("entryTypes.groceries") },
    { value: "pantry", label: t("entryTypes.pantry") },
    { value: "shopping_lists", label: t("entryTypes.shopping_lists") },
    { value: "recipes", label: t("entryTypes.recipes") },
    { value: "meal_plans", label: t("entryTypes.meal_plans") },
    { value: "kitchen_equipment", label: t("entryTypes.kitchen_equipment") },
    { value: "restaurants", label: t("entryTypes.restaurants") },
    { value: "restaurant_meals", label: t("entryTypes.restaurant_meals") },
    { value: "nutrition_logs", label: t("entryTypes.nutrition_logs") },
    { value: "nutrition_goals", label: t("entryTypes.nutrition_goals") },
    { value: "health_metrics", label: t("entryTypes.health_metrics") },
    { value: "user_skills", label: t("entryTypes.user_skills") },
    { value: "cooking_history", label: t("entryTypes.cooking_history") },
    { value: "recipe_collections", label: t("entryTypes.recipe_collections") },
  ];

  const MONTHS = [
    { value: 1, label: t("months.january") },
    { value: 2, label: t("months.february") },
    { value: 3, label: t("months.march") },
    { value: 4, label: t("months.april") },
    { value: 5, label: t("months.may") },
    { value: 6, label: t("months.june") },
    { value: 7, label: t("months.july") },
    { value: 8, label: t("months.august") },
    { value: 9, label: t("months.september") },
    { value: 10, label: t("months.october") },
    { value: 11, label: t("months.november") },
    { value: 12, label: t("months.december") },
  ];

  const FORMATS: { value: ExportFormat; label: string }[] = [
    { value: "csv", label: t("formats.csv") },
  ];

  const currentDate = new Date();
  const [entryType, setEntryType] = useState<EntryType>("groceries");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);

  const [downloadExport, { isLoading }] = useDownloadExportMutation();

  // Entry types that support date range filtering
  const DATE_FILTERABLE_TYPES: EntryType[] = [
    "groceries",
    "restaurant_meals",
    "nutrition_logs",
    "health_metrics",
    "cooking_history",
    "meal_plans",
  ];
  const supportsDateFilter = DATE_FILTERABLE_TYPES.includes(entryType);

  // Generate year options (current year and past 5 years)
  const years = Array.from(
    { length: 6 },
    (_, i) => currentDate.getFullYear() - i
  );

  const handleExport = async () => {
    try {
      // Only include dates for modules that support date filtering
      const requestData: ExportRequest = {
        entry_type: entryType,
        format,
        start_date: null,
        end_date: null,
      };

      if (supportsDateFilter) {
        // Convert year/month to start_date and end_date
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month
        requestData.start_date = startDate.toISOString();
        requestData.end_date = endDate.toISOString();
      }

      const blob = await downloadExport(requestData).unwrap();

      // Generate filename
      let filename: string;
      if (supportsDateFilter) {
        const monthName =
          MONTHS.find((m) => m.value === month)?.label || "Unknown";
        filename = `${entryType}_${monthName}_${year}.${format}`;
      } else {
        filename = `${entryType}_all.${format}`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t("messages.successTitle"), {
        description: t("messages.successDescription", { filename }),
      });
    } catch (err) {
      const error = err as FetchBaseQueryError | SerializedError;

      if ("status" in error) {
        const fetchError = error as FetchBaseQueryError;
        if (fetchError.status === 403) {
          toast.error(t("messages.errorAccessDenied"), {
            description: t("messages.errorAccessDeniedDescription"),
          });
        } else {
          const errorData = fetchError.data as { detail?: string } | undefined;
          toast.error(t("messages.errorFailed"), {
            description: errorData?.detail || t("messages.errorFailedDescription"),
          });
        }
      } else {
        toast.error(t("messages.errorFailed"), {
          description: t("messages.errorFailedDescription"),
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            {t("card.title")}
          </CardTitle>
          <CardDescription>{t("card.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Entry Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="entry-type">{t("labels.dataType")}</Label>
              <Select
                value={entryType}
                onValueChange={(value) => setEntryType(value as EntryType)}
              >
                <SelectTrigger id="entry-type">
                  <SelectValue placeholder={t("placeholders.selectDataType")} />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format Selector */}
            <div className="space-y-2">
              <Label htmlFor="format">{t("labels.exportFormat")}</Label>
              <Select
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder={t("placeholders.selectFormat")} />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Selector - Only for date-filterable modules */}
            {supportsDateFilter && (
              <div className="space-y-2">
                <Label htmlFor="month">{t("labels.month")}</Label>
                <Select
                  value={month.toString()}
                  onValueChange={(value) => setMonth(parseInt(value))}
                >
                  <SelectTrigger id="month">
                    <SelectValue placeholder={t("placeholders.selectMonth")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Year Selector - Only for date-filterable modules */}
            {supportsDateFilter && (
              <div className="space-y-2">
                <Label htmlFor="year">{t("labels.year")}</Label>
                <Select
                  value={year.toString()}
                  onValueChange={(value) => setYear(parseInt(value))}
                >
                  <SelectTrigger id="year">
                    <SelectValue placeholder={t("placeholders.selectYear")} />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleExport}
              disabled={isLoading}
              size="lg"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isLoading ? t("buttons.exporting") : t("buttons.export")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("info.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• {t("info.point1")}</p>
          <p>• {t("info.point2")}</p>
          <p>• {t("info.point3")}</p>
          <p>• {t("info.point4")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
