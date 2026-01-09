"use client";

import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FileText, Mic, Camera, StickyNote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  ImportWizardProvider,
  ImportWizard,
  ImportMethodSelector,
  ImportStepContent,
  TextImport,
  VoiceImport,
  PhotoImport,
  ImportReview,
  ImportComplete,
  useImportWizard,
  type ImportMethod,
  type ParsedItem,
  type ColumnDefinition,
  type PhotoImportType,
} from "@/components/shared/import";
import {
  useCreateShoppingListMutation,
  useParseShoppingListTextMutation,
  useParseShoppingListVoiceMutation,
  useParseShoppingListImageMutation,
  SHOPPING_LIST_CATEGORIES,
  type CreateShoppingListItemInput,
  type ShoppingListItemCategory,
} from "@/lib/api/shopping-lists-api";

// Category badge colors - matches the ones used in grocery-table.tsx
function getCategoryBadgeColor(category: string | null): string {
  const colors: Record<string, string> = {
    produce: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    meat: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    seafood: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    dairy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    bakery: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    frozen: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    pantry: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    beverages: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    snacks: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    condiments: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300",
    spices: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  return colors[category || "other"] || colors.other;
}

// Extend ParsedItem with shopping list item fields
export interface ParsedShoppingListItem extends ParsedItem {
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
}

interface ShoppingListImportProps {
  onComplete?: () => void;
  onViewItems?: () => void;
}

export function ShoppingListImport({
  onComplete,
  onViewItems,
}: ShoppingListImportProps) {
  const t = useTranslations("shoppingLists.import");
  const tGroceries = useTranslations("groceries");

  const [createShoppingList] = useCreateShoppingListMutation();
  const [parseText] = useParseShoppingListTextMutation();
  const [parseVoice] = useParseShoppingListVoiceMutation();
  const [parseImage] = useParseShoppingListImageMutation();

  // Define available import methods for shopping lists
  const importMethods: ImportMethod[] = useMemo(
    () => [
      {
        id: "text",
        icon: <FileText className="h-6 w-6" />,
        titleKey: "methods.text.title",
        descriptionKey: "methods.text.description",
      },
      {
        id: "voice",
        icon: <Mic className="h-6 w-6" />,
        titleKey: "methods.voice.title",
        descriptionKey: "methods.voice.description",
      },
      {
        id: "photo_paper_list",
        icon: <Camera className="h-6 w-6" />,
        titleKey: "methods.paperList.title",
        descriptionKey: "methods.paperList.description",
      },
      {
        id: "photo_screenshot",
        icon: <StickyNote className="h-6 w-6" />,
        titleKey: "methods.screenshot.title",
        descriptionKey: "methods.screenshot.description",
      },
    ],
    []
  );

  // Define columns for the review table
  const columns: ColumnDefinition<ParsedShoppingListItem>[] = useMemo(
    () => [
      {
        key: "ingredient_name",
        header: t("fields.itemName"),
        type: "text",
        width: "200px",
        required: true,
      },
      {
        key: "quantity",
        header: t("fields.quantity"),
        type: "number",
        width: "80px",
      },
      {
        key: "unit",
        header: t("fields.unit"),
        type: "text",
        width: "80px",
      },
      {
        key: "category",
        header: t("fields.category"),
        type: "select",
        width: "140px",
        options: SHOPPING_LIST_CATEGORIES.map((cat) => ({
          value: cat.value,
          label: tGroceries(`categories.${cat.value}`),
        })),
        renderCell: (value) => {
          const category = value as string | null;
          if (!category) return null;
          return (
            <Badge
              variant="secondary"
              className={getCategoryBadgeColor(category)}
            >
              {tGroceries(`categories.${category}`)}
            </Badge>
          );
        },
      },
    ],
    [t, tGroceries]
  );

  // Generate a unique ID
  const generateId = () => {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Convert API response to ParsedShoppingListItem format
  const convertToParseItem = useCallback(
    (
      items: { ingredient_name: string; quantity?: number | null; unit?: string | null; category?: string | null }[]
    ): ParsedShoppingListItem[] => {
      return items.map((item) => ({
        id: generateId(),
        ingredient_name: item.ingredient_name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        category: item.category ?? null,
      }));
    },
    []
  );

  // Handle text parsing
  const handleParseText = useCallback(
    async (text: string): Promise<ParsedShoppingListItem[]> => {
      const response = await parseText({ text }).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse text");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseText, convertToParseItem]
  );

  // Handle voice transcription and parsing
  const handleTranscribeAndParse = useCallback(
    async (audioBlob: Blob): Promise<ParsedShoppingListItem[]> => {
      const mimeToExt: Record<string, string> = {
        "audio/mp4": "mp4",
        "audio/webm": "webm",
        "audio/webm;codecs=opus": "webm",
        "audio/ogg": "ogg",
        "audio/ogg;codecs=opus": "ogg",
      };
      const extension = mimeToExt[audioBlob.type] || "webm";
      const filename = `recording.${extension}`;

      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      formData.append("language", "auto");

      const response = await parseVoice(formData).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to transcribe audio");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseVoice, convertToParseItem]
  );

  // Handle image parsing
  const handleParseImage = useCallback(
    async (
      file: File,
      importType: PhotoImportType
    ): Promise<ParsedShoppingListItem[]> => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("import_type", importType);

      const response = await parseImage(formData).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(
          response.message || "Failed to parse image"
        );
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseImage, convertToParseItem]
  );

  // Handle multiple images parsing
  const handleParseMultipleImages = useCallback(
    async (
      files: File[],
      importType: PhotoImportType
    ): Promise<ParsedShoppingListItem[]> => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("import_type", importType);

      const response = await parseImage(formData).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(
          response.message || "Failed to parse images"
        );
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseImage, convertToParseItem]
  );

  // Handle saving items - create a new shopping list with the parsed items
  const handleSave = useCallback(
    async (items: ParsedShoppingListItem[]) => {
      const listItems: CreateShoppingListItemInput[] = items.map((item) => ({
        ingredient_name: item.ingredient_name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category as ShoppingListItemCategory | undefined,
      }));

      // Create a new shopping list with the imported items
      const today = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      await createShoppingList({
        name: `Imported List - ${today}`,
        items: listItems,
      }).unwrap();

      onComplete?.();
    },
    [createShoppingList, onComplete]
  );

  // Example text for the text import
  const exampleText = t("textExample");

  return (
    <ImportWizardProvider<ParsedShoppingListItem>>
      <ImportWizard showSteps>
        {/* Step 1: Select import method */}
        <ImportStepContent step="method">
          <ImportMethodSelector
            methods={importMethods}
            translationNamespace="shoppingLists.import"
          />
        </ImportStepContent>

        {/* Step 2: Input data based on selected method */}
        <ImportStepContent step="input">
          <ImportInputContent
            onParseText={handleParseText}
            onTranscribeAndParse={handleTranscribeAndParse}
            onParseImage={handleParseImage}
            onParseMultipleImages={handleParseMultipleImages}
            exampleText={exampleText}
          />
        </ImportStepContent>

        {/* Step 3: Review parsed items */}
        <ImportStepContent step="review">
          <ImportReview<ParsedShoppingListItem>
            columns={columns}
            onSave={handleSave}
            itemNameKey="ingredient_name"
            translationNamespace="shoppingLists.import"
            saveButtonTextKey="review.addShoppingList"
          />
        </ImportStepContent>

        {/* Step 4: Complete */}
        <ImportStepContent step="complete">
          <ImportCompleteWrapper onViewItems={onViewItems} />
        </ImportStepContent>
      </ImportWizard>
    </ImportWizardProvider>
  );
}

// Sub-component to render the correct input component based on selected method
function ImportInputContent({
  onParseText,
  onTranscribeAndParse,
  onParseImage,
  onParseMultipleImages,
  exampleText,
}: {
  onParseText: (text: string) => Promise<ParsedShoppingListItem[]>;
  onTranscribeAndParse: (blob: Blob) => Promise<ParsedShoppingListItem[]>;
  onParseImage: (
    file: File,
    type: PhotoImportType
  ) => Promise<ParsedShoppingListItem[]>;
  onParseMultipleImages: (
    files: File[],
    type: PhotoImportType
  ) => Promise<ParsedShoppingListItem[]>;
  exampleText: string;
}) {
  const { selectedMethod } = useImportWizard<ParsedShoppingListItem>();
  const t = useTranslations("shoppingLists.import");

  switch (selectedMethod) {
    case "text":
      return (
        <TextImport<ParsedShoppingListItem>
          onParse={onParseText}
          placeholder={t("textPlaceholder")}
          exampleText={exampleText}
        />
      );

    case "voice":
      return (
        <VoiceImport<ParsedShoppingListItem>
          onTranscribeAndParse={onTranscribeAndParse}
          maxDurationSeconds={120}
        />
      );

    case "photo_paper_list":
      return (
        <PhotoImport<ParsedShoppingListItem>
          importType="shopping_list"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    case "photo_screenshot":
      return (
        <PhotoImport<ParsedShoppingListItem>
          importType="screenshot"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    default:
      return null;
  }
}

// Wrapper for ImportComplete to access wizard context
function ImportCompleteWrapper({
  onViewItems,
}: {
  onViewItems?: () => void;
}) {
  const { parsedItems } = useImportWizard<ParsedShoppingListItem>();

  return (
    <ImportComplete itemCount={parsedItems.length} onViewItems={onViewItems} />
  );
}
