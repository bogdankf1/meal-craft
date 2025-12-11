"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link2, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useImportWizard, type ParsedItem } from "@/components/shared/import";

interface UrlImportProps<T extends ParsedItem> {
  onParseUrl: (url: string) => Promise<T[]>;
}

export function UrlImport<T extends ParsedItem>({ onParseUrl }: UrlImportProps<T>) {
  const t = useTranslations("import");
  const { setParsedItems, setStep } = useImportWizard<T>();

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleParse = async () => {
    if (!url.trim()) {
      setError(t("url.errorEmpty"));
      return;
    }

    if (!isValidUrl(url.trim())) {
      setError(t("url.errorInvalid"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const items = await onParseUrl(url.trim());
      if (items.length === 0) {
        setError(t("url.errorNoRecipes"));
        return;
      }
      setParsedItems(items);
      setStep("review");
    } catch (err) {
      console.error("Error parsing URL:", err);
      setError(err instanceof Error ? err.message : t("url.errorFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("url.label")}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("url.placeholder")}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleParse();
                  }
                }}
                className="pl-9"
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleParse} disabled={isLoading || !url.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("url.parsing")}
                </>
              ) : (
                t("url.parse")
              )}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground">{t("url.hint")}</p>
          <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>{t("url.hintItem1")}</li>
            <li>{t("url.hintItem2")}</li>
            <li>{t("url.hintItem3")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
