"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useImportWizard, ParsedItem } from "./ImportWizard";

interface TextImportProps<T extends ParsedItem> {
  onParse: (text: string) => Promise<T[]>;
  placeholder?: string;
  exampleText?: string;
  minLength?: number;
  maxLength?: number;
  initialText?: string;
}

export function TextImport<T extends ParsedItem>({
  onParse,
  placeholder,
  exampleText,
  minLength = 3,
  maxLength = 10000,
  initialText = "",
}: TextImportProps<T>) {
  const t = useTranslations("import");
  const [text, setText] = useState(initialText);
  const { setParsedItems, setStep, isProcessing, setIsProcessing } = useImportWizard<T>();

  const handleParse = async () => {
    if (text.length < minLength) return;

    setIsProcessing(true);
    try {
      const items = await onParse(text);
      setParsedItems(items);
      setStep("review");
    } catch (error) {
      console.error("Failed to parse text:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseExample = () => {
    if (exampleText) {
      setText(exampleText);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("text.title")}
        </CardTitle>
        <CardDescription>{t("text.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder || t("text.placeholder")}
            rows={8}
            maxLength={maxLength}
            className="resize-none"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {text.length} / {maxLength}
            </span>
            {exampleText && (
              <button
                type="button"
                onClick={handleUseExample}
                className="text-primary hover:underline"
              >
                {t("text.useExample")}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleParse}
            disabled={text.length < minLength || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("text.parsing")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("text.parseWithAI")}
              </>
            )}
          </Button>
        </div>

        {/* Hints */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">{t("text.hints.title")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t("text.hints.hint1")}</li>
            <li>{t("text.hints.hint2")}</li>
            <li>{t("text.hints.hint3")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
