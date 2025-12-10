"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link2, Loader2, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useImportWizard, ParsedItem } from "./ImportWizard";

interface DigitalReceiptImportProps<T extends ParsedItem> {
  onParseUrl: (url: string) => Promise<T[]>;
}

export function DigitalReceiptImport<T extends ParsedItem>({
  onParseUrl,
}: DigitalReceiptImportProps<T>) {
  const t = useTranslations("import");
  const { setParsedItems, setStep, isProcessing, setIsProcessing } = useImportWizard<T>();

  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleProcess = async () => {
    if (!url.trim()) {
      setError(t("digitalReceipt.errors.emptyUrl"));
      return;
    }

    if (!isValidUrl(url)) {
      setError(t("digitalReceipt.errors.invalidUrl"));
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const items = await onParseUrl(url);
      setParsedItems(items);
      setStep("review");
    } catch (err) {
      console.error("Failed to parse receipt URL:", err);
      setError(t("digitalReceipt.errors.processingFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isProcessing) {
      handleProcess();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          {t("digitalReceipt.title")}
        </CardTitle>
        <CardDescription>{t("digitalReceipt.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="receipt-url">{t("digitalReceipt.urlLabel")}</Label>
          <div className="flex gap-2">
            <Input
              id="receipt-url"
              type="url"
              placeholder={t("digitalReceipt.urlPlaceholder")}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1"
              disabled={isProcessing}
            />
            {url && isValidUrl(url) && (
              <Button
                variant="outline"
                size="icon"
                asChild
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {/* Process button */}
        <div className="flex justify-center">
          <Button
            onClick={handleProcess}
            disabled={isProcessing || !url.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("digitalReceipt.processing")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("digitalReceipt.parseReceipt")}
              </>
            )}
          </Button>
        </div>

        {/* Supported services */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">{t("digitalReceipt.supportedServices")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Silpo (receipt.silpo.elkasa.com.ua)</li>
            <li>ATB (receipt.atbmarket.com)</li>
            <li>Novus (receipt.novus.ua)</li>
            <li>{t("digitalReceipt.otherServices")}</li>
          </ul>
        </div>

        {/* Hints */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">{t("digitalReceipt.hints.title")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t("digitalReceipt.hints.hint1")}</li>
            <li>{t("digitalReceipt.hints.hint2")}</li>
            <li>{t("digitalReceipt.hints.hint3")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
