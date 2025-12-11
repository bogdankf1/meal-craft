"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useDropzone, FileRejection } from "react-dropzone";
import {
  Camera,
  Upload,
  X,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  FileImage,
  Images,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useImageProcessor } from "@/hooks/useImageProcessor";
import { useImportWizard, ParsedItem } from "./ImportWizard";

export type PhotoImportType =
  | "groceries" // Photo of groceries on table/floor
  | "pantry" // Photo of pantry items
  | "equipment" // Photo of kitchen equipment
  | "paper_receipt" // Paper receipt photo
  | "paper_list" // Paper list/notes photo
  | "digital_receipt" // Screenshot of digital receipt
  | "delivery_app" // Screenshot from delivery app
  | "shopping_list" // Handwritten shopping list
  | "screenshot" // Screenshot from Notes or other app
  | "app_screenshot"; // Screenshot from other app

interface PhotoImportProps<T extends ParsedItem> {
  importType: PhotoImportType;
  onParseImage: (file: File, importType: PhotoImportType) => Promise<T[]>;
  onParseMultipleImages?: (
    files: File[],
    importType: PhotoImportType
  ) => Promise<T[]>;
  acceptedFormats?: string[];
  maxSizeMB?: number;
}

export function PhotoImport<T extends ParsedItem>({
  importType,
  onParseImage,
  onParseMultipleImages,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp", "image/heic"],
}: PhotoImportProps<T>) {
  const t = useTranslations("import");
  const { setParsedItems, setStep, isProcessing, setIsProcessing } =
    useImportWizard<T>();

  // Multi-file support for certain import types
  const supportsMultiple =
    (importType === "delivery_app" ||
      importType === "groceries" ||
      importType === "paper_receipt" ||
      importType === "shopping_list") &&
    !!onParseMultipleImages;

  // Use the image processor hook
  const {
    files: processedFiles,
    previewUrls,
    isProcessing: isCompressing,
    error,
    addFiles,
    removeFile,
    clearFiles,
    hasFiles,
    fileCount,
  } = useImageProcessor({
    maxFiles: supportsMultiple ? 10 : 1,
    maxFileSizeMB: 50,
    maxSizeMB: 2,
    maxWidthOrHeight: 2048,
  });

  const getTypeConfig = () => {
    switch (importType) {
      case "groceries":
        return {
          titleKey: "photo.groceries.title",
          descriptionKey: supportsMultiple
            ? "photo.groceries.descriptionMultiple"
            : "photo.groceries.description",
          icon: supportsMultiple ? (
            <Images className="h-5 w-5" />
          ) : (
            <Camera className="h-5 w-5" />
          ),
          hints: [
            "photo.groceries.hint1",
            "photo.groceries.hint2",
            "photo.groceries.hint3",
          ],
        };
      case "paper_receipt":
        return {
          titleKey: "photo.paperReceipt.title",
          descriptionKey: supportsMultiple
            ? "photo.paperReceipt.descriptionMultiple"
            : "photo.paperReceipt.description",
          icon: supportsMultiple ? (
            <Images className="h-5 w-5" />
          ) : (
            <FileImage className="h-5 w-5" />
          ),
          hints: [
            "photo.paperReceipt.hint1",
            "photo.paperReceipt.hint2",
            "photo.paperReceipt.hint3",
          ],
        };
      case "digital_receipt":
        return {
          titleKey: "photo.digitalReceipt.title",
          descriptionKey: "photo.digitalReceipt.description",
          icon: <ImageIcon className="h-5 w-5" />,
          hints: [
            "photo.digitalReceipt.hint1",
            "photo.digitalReceipt.hint2",
            "photo.digitalReceipt.hint3",
          ],
        };
      case "delivery_app":
        return {
          titleKey: "photo.deliveryApp.title",
          descriptionKey: supportsMultiple
            ? "photo.deliveryApp.descriptionMultiple"
            : "photo.deliveryApp.description",
          icon: supportsMultiple ? (
            <Images className="h-5 w-5" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          ),
          hints: [
            "photo.deliveryApp.hint1",
            "photo.deliveryApp.hint2",
            "photo.deliveryApp.hint3",
          ],
        };
      case "shopping_list":
        return {
          titleKey: "photo.shoppingList.title",
          descriptionKey: supportsMultiple
            ? "photo.shoppingList.descriptionMultiple"
            : "photo.shoppingList.description",
          icon: supportsMultiple ? (
            <Images className="h-5 w-5" />
          ) : (
            <Camera className="h-5 w-5" />
          ),
          hints: [
            "photo.shoppingList.hint1",
            "photo.shoppingList.hint2",
            "photo.shoppingList.hint3",
          ],
        };
      case "screenshot":
      case "app_screenshot":
        return {
          titleKey: "photo.screenshot.title",
          descriptionKey: "photo.screenshot.description",
          icon: <ImageIcon className="h-5 w-5" />,
          hints: [
            "photo.screenshot.hint1",
            "photo.screenshot.hint2",
            "photo.screenshot.hint3",
          ],
        };
      case "pantry":
        return {
          titleKey: "photo.pantry.title",
          descriptionKey: supportsMultiple
            ? "photo.pantry.descriptionMultiple"
            : "photo.pantry.description",
          icon: supportsMultiple ? (
            <Images className="h-5 w-5" />
          ) : (
            <Camera className="h-5 w-5" />
          ),
          hints: [
            "photo.pantry.hint1",
            "photo.pantry.hint2",
            "photo.pantry.hint3",
          ],
        };
      case "paper_list":
        return {
          titleKey: "photo.paperList.title",
          descriptionKey: supportsMultiple
            ? "photo.paperList.descriptionMultiple"
            : "photo.paperList.description",
          icon: supportsMultiple ? (
            <Images className="h-5 w-5" />
          ) : (
            <FileImage className="h-5 w-5" />
          ),
          hints: [
            "photo.paperList.hint1",
            "photo.paperList.hint2",
            "photo.paperList.hint3",
          ],
        };
      case "equipment":
        return {
          titleKey: "photo.equipment.title",
          descriptionKey: supportsMultiple
            ? "photo.equipment.descriptionMultiple"
            : "photo.equipment.description",
          icon: supportsMultiple ? (
            <Images className="h-5 w-5" />
          ) : (
            <Camera className="h-5 w-5" />
          ),
          hints: [
            "photo.equipment.hint1",
            "photo.equipment.hint2",
            "photo.equipment.hint3",
          ],
        };
      default:
        return {
          titleKey: "photo.groceries.title",
          descriptionKey: "photo.groceries.description",
          icon: <Camera className="h-5 w-5" />,
          hints: [
            "photo.groceries.hint1",
            "photo.groceries.hint2",
            "photo.groceries.hint3",
          ],
        };
    }
  };

  const config = getTypeConfig();

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Handle rejections for truly invalid files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        // Large files will be handled by the image processor (it compresses them)
        // Only reject if it's an invalid type
        if (rejection.errors[0]?.code === "file-invalid-type") {
          return;
        }
        // For large files, add them anyway - the hook will compress
        if (rejection.errors[0]?.code === "file-too-large") {
          acceptedFiles = [...acceptedFiles, rejection.file];
        }
      }

      if (acceptedFiles.length > 0) {
        await addFiles(acceptedFiles);
      }
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce(
      (acc, format) => ({ ...acc, [format]: [] }),
      {}
    ),
    maxSize: 50 * 1024 * 1024, // Allow up to 50MB - we'll compress large files
    maxFiles: supportsMultiple ? 10 : 1,
    multiple: supportsMultiple,
  });

  const handleProcess = async () => {
    if (!hasFiles) return;

    setIsProcessing(true);
    try {
      const files = processedFiles.map((pf) => pf.file);

      if (supportsMultiple && files.length > 0) {
        const items = await onParseMultipleImages!(files, importType);
        setParsedItems(items);
      } else if (files.length > 0) {
        const items = await onParseImage(files[0], importType);
        setParsedItems(items);
      }
      setStep("review");
    } catch (err) {
      console.error("Failed to process images:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {config.icon}
          {t(config.titleKey)}
        </CardTitle>
        <CardDescription>{t(config.descriptionKey)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCompressing ? (
          // Compressing state
          <div className="border-2 border-dashed rounded-lg p-8 text-center border-primary/50 bg-primary/5">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-muted">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <p className="font-medium">{t("photo.compressing")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("photo.compressingDescription")}
                </p>
              </div>
            </div>
          </div>
        ) : !hasFiles ? (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {isDragActive
                    ? t("photo.dropHere")
                    : supportsMultiple
                      ? t("photo.dragOrClickMultiple")
                      : t("photo.dragOrClick")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("photo.acceptedFormats", { formats: "JPG, PNG, WebP, HEIC" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("photo.autoCompress")}
                </p>
              </div>
            </div>
          </div>
        ) : supportsMultiple ? (
          // Multi-file preview grid
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {processedFiles.map((pf, index) => (
                <div
                  key={index}
                  className="relative rounded-lg overflow-hidden border bg-muted aspect-square"
                >
                  {previewUrls[index] && (
                    <img
                      src={previewUrls[index]}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                    {pf.originalName}
                  </div>
                </div>
              ))}
              {/* Add more button */}
              <div
                {...getRootProps()}
                className={cn(
                  "flex items-center justify-center rounded-lg border-2 border-dashed aspect-square cursor-pointer transition-colors",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="text-center p-2">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("photo.addMore")}
                  </p>
                </div>
              </div>
            </div>

            {/* Files info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("photo.filesSelected", { count: fileCount })}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFiles}>
                {t("photo.clearAll")}
              </Button>
            </div>
          </div>
        ) : (
          // Single file preview
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative rounded-lg overflow-hidden border">
              <img
                src={previewUrls[0] || ""}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain bg-muted"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={clearFiles}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* File info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate">
                {processedFiles[0]?.originalName}
              </span>
              <span className="text-muted-foreground">
                {processedFiles[0] &&
                  (processedFiles[0].processedSize / (1024 * 1024)).toFixed(2)}{" "}
                MB
              </span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-sm text-destructive text-center">{error}</div>
        )}

        {/* Process button */}
        {hasFiles && (
          <div className="flex justify-center">
            <Button onClick={handleProcess} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {supportsMultiple
                    ? t("photo.processingMultiple", { count: fileCount })
                    : t("photo.processing")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {supportsMultiple
                    ? t("photo.analyzeWithAIMultiple", { count: fileCount })
                    : t("photo.analyzeWithAI")}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Hints */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">{t("photo.hints.title")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            {config.hints.map((hintKey) => (
              <li key={hintKey}>{t(hintKey)}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
