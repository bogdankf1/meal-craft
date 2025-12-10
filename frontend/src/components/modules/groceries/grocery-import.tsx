"use client";

import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Mic,
  Camera,
  Receipt,
  Smartphone,
  Link2,
} from "lucide-react";

import {
  ImportWizardProvider,
  ImportWizard,
  ImportMethodSelector,
  ImportStepContent,
  TextImport,
  VoiceImport,
  PhotoImport,
  DigitalReceiptImport,
  ImportReview,
  ImportComplete,
  useImportWizard,
  type ImportMethod,
  type ParsedItem,
  type ColumnDefinition,
  type PhotoImportType,
} from "@/components/shared/import";
import {
  useCreateGroceriesMutation,
  useParseGroceryTextMutation,
  useParseGroceryVoiceMutation,
  useParseGroceryImageMutation,
  useParseReceiptUrlMutation,
  GROCERY_CATEGORIES,
  type CreateGroceryInput,
  type GroceryCategory,
} from "@/lib/api/groceries-api";

// Extend ParsedItem with grocery-specific fields
export interface ParsedGroceryItem extends ParsedItem {
  item_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  purchase_date: string;
  expiry_date: string | null;
  cost: number | null;
  store: string | null;
}

interface GroceryImportProps {
  onComplete?: () => void;
  onViewItems?: () => void;
}

export function GroceryImport({ onComplete, onViewItems }: GroceryImportProps) {
  const t = useTranslations("import");
  const tGroceries = useTranslations("groceries");

  const [createGroceries] = useCreateGroceriesMutation();
  const [parseGroceryText] = useParseGroceryTextMutation();
  const [parseGroceryVoice] = useParseGroceryVoiceMutation();
  const [parseGroceryImage] = useParseGroceryImageMutation();
  const [parseReceiptUrl] = useParseReceiptUrlMutation();

  // Define available import methods
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
        id: "photo_groceries",
        icon: <Camera className="h-6 w-6" />,
        titleKey: "methods.photoGroceries.title",
        descriptionKey: "methods.photoGroceries.description",
      },
      {
        id: "photo_paper_receipt",
        icon: <Receipt className="h-6 w-6" />,
        titleKey: "methods.paperReceipt.title",
        descriptionKey: "methods.paperReceipt.description",
      },
      {
        id: "digital_receipt_url",
        icon: <Link2 className="h-6 w-6" />,
        titleKey: "methods.digitalReceipt.title",
        descriptionKey: "methods.digitalReceipt.description",
      },
      {
        id: "photo_delivery_app",
        icon: <Smartphone className="h-6 w-6" />,
        titleKey: "methods.deliveryApp.title",
        descriptionKey: "methods.deliveryApp.description",
      },
    ],
    []
  );

  // Define columns for the review table
  const columns: ColumnDefinition<ParsedGroceryItem>[] = useMemo(
    () => [
      {
        key: "item_name",
        header: tGroceries("fields.itemName"),
        type: "text",
        width: "200px",
        required: true,
      },
      {
        key: "quantity",
        header: tGroceries("fields.quantity"),
        type: "number",
        width: "80px",
      },
      {
        key: "unit",
        header: tGroceries("fields.unit"),
        type: "text",
        width: "80px",
      },
      {
        key: "category",
        header: tGroceries("fields.category"),
        type: "select",
        width: "120px",
        options: GROCERY_CATEGORIES.map((cat) => ({
          value: cat.value,
          label: tGroceries(`categories.${cat.value}`),
        })),
      },
      {
        key: "cost",
        header: tGroceries("fields.cost"),
        type: "number",
        width: "100px",
      },
      {
        key: "store",
        header: tGroceries("fields.store"),
        type: "text",
        width: "120px",
      },
    ],
    [tGroceries]
  );

  // Generate a unique ID
  const generateId = () => {
    return crypto.randomUUID ? crypto.randomUUID() :
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Convert API response to ParsedGroceryItem format
  const convertToParseItem = useCallback(
    (items: CreateGroceryInput[]): ParsedGroceryItem[] => {
      return items.map((item) => ({
        id: generateId(),
        item_name: item.item_name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        category: item.category ?? null,
        purchase_date: item.purchase_date || new Date().toISOString().split("T")[0],
        expiry_date: item.expiry_date ?? null,
        cost: item.cost ?? null,
        store: item.store ?? null,
      }));
    },
    []
  );

  // Handle text parsing
  const handleParseText = useCallback(
    async (text: string): Promise<ParsedGroceryItem[]> => {
      const response = await parseGroceryText({
        text,
        default_purchase_date: new Date().toISOString().split("T")[0],
      }).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse text");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseGroceryText, convertToParseItem]
  );

  // Handle voice transcription and parsing
  const handleTranscribeAndParse = useCallback(
    async (audioBlob: Blob): Promise<ParsedGroceryItem[]> => {
      // Determine file extension from MIME type
      const mimeToExt: Record<string, string> = {
        'audio/mp4': 'mp4',
        'audio/webm': 'webm',
        'audio/webm;codecs=opus': 'webm',
        'audio/ogg': 'ogg',
        'audio/ogg;codecs=opus': 'ogg',
      };
      const extension = mimeToExt[audioBlob.type] || 'webm';
      const filename = `recording.${extension}`;

      console.log('[GroceryImport] Sending audio:', {
        type: audioBlob.type,
        size: audioBlob.size,
        filename,
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      formData.append("language", "auto"); // Auto-detect language
      formData.append("default_purchase_date", new Date().toISOString().split("T")[0]);

      const response = await parseGroceryVoice(formData).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to transcribe audio");
      }

      // Return empty array if no items found - the review step will handle this
      return convertToParseItem(response.parsed_items);
    },
    [parseGroceryVoice, convertToParseItem]
  );

  // Handle image parsing
  const handleParseImage = useCallback(
    async (file: File, importType: PhotoImportType): Promise<ParsedGroceryItem[]> => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("import_type", importType);
      formData.append("default_purchase_date", new Date().toISOString().split("T")[0]);

      const response = await parseGroceryImage(formData).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse image");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseGroceryImage, convertToParseItem]
  );

  // Handle multiple images parsing (for delivery app screenshots)
  const handleParseMultipleImages = useCallback(
    async (files: File[], importType: PhotoImportType): Promise<ParsedGroceryItem[]> => {
      const formData = new FormData();

      // Append all images
      files.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("import_type", importType);
      formData.append("default_purchase_date", new Date().toISOString().split("T")[0]);

      const response = await parseGroceryImage(formData).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse images");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseGroceryImage, convertToParseItem]
  );

  // Handle receipt URL parsing
  const handleParseReceiptUrl = useCallback(
    async (url: string): Promise<ParsedGroceryItem[]> => {
      const response = await parseReceiptUrl({
        url,
        default_purchase_date: new Date().toISOString().split("T")[0],
      }).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse receipt");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseReceiptUrl, convertToParseItem]
  );

  // Handle saving items to the database
  const handleSave = useCallback(
    async (items: ParsedGroceryItem[]) => {
      const groceryInputs: CreateGroceryInput[] = items.map((item) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category as GroceryCategory | undefined,
        purchase_date: item.purchase_date,
        expiry_date: item.expiry_date,
        cost: item.cost,
        store: item.store,
      }));

      await createGroceries(groceryInputs).unwrap();
      onComplete?.();
    },
    [createGroceries, onComplete]
  );

  // Example text for the text import
  const exampleText = t("text.groceryExample");

  return (
    <ImportWizardProvider<ParsedGroceryItem>>
      <ImportWizard showSteps>
        {/* Step 1: Select import method */}
        <ImportStepContent step="method">
          <ImportMethodSelector methods={importMethods} />
        </ImportStepContent>

        {/* Step 2: Input data based on selected method */}
        <ImportStepContent step="input">
          <ImportInputContent
            onParseText={handleParseText}
            onTranscribeAndParse={handleTranscribeAndParse}
            onParseImage={handleParseImage}
            onParseMultipleImages={handleParseMultipleImages}
            onParseReceiptUrl={handleParseReceiptUrl}
            exampleText={exampleText}
          />
        </ImportStepContent>

        {/* Step 3: Review parsed items */}
        <ImportStepContent step="review">
          <ImportReview<ParsedGroceryItem>
            columns={columns}
            onSave={handleSave}
            itemNameKey="item_name"
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
  onParseReceiptUrl,
  exampleText,
}: {
  onParseText: (text: string) => Promise<ParsedGroceryItem[]>;
  onTranscribeAndParse: (blob: Blob) => Promise<ParsedGroceryItem[]>;
  onParseImage: (file: File, type: PhotoImportType) => Promise<ParsedGroceryItem[]>;
  onParseMultipleImages: (files: File[], type: PhotoImportType) => Promise<ParsedGroceryItem[]>;
  onParseReceiptUrl: (url: string) => Promise<ParsedGroceryItem[]>;
  exampleText: string;
}) {
  const { selectedMethod } = useImportWizard<ParsedGroceryItem>();
  const t = useTranslations("import");

  switch (selectedMethod) {
    case "text":
      return (
        <TextImport<ParsedGroceryItem>
          onParse={onParseText}
          placeholder={t("text.placeholder")}
          exampleText={exampleText}
        />
      );

    case "voice":
      return (
        <VoiceImport<ParsedGroceryItem>
          onTranscribeAndParse={onTranscribeAndParse}
          maxDurationSeconds={120}
        />
      );

    case "photo_groceries":
      return (
        <PhotoImport<ParsedGroceryItem>
          importType="groceries"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    case "photo_paper_receipt":
      return (
        <PhotoImport<ParsedGroceryItem>
          importType="paper_receipt"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    case "digital_receipt_url":
      return (
        <DigitalReceiptImport<ParsedGroceryItem>
          onParseUrl={onParseReceiptUrl}
        />
      );

    case "photo_delivery_app":
      return (
        <PhotoImport<ParsedGroceryItem>
          importType="delivery_app"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    default:
      return null;
  }
}

// Wrapper for ImportComplete to access wizard context
function ImportCompleteWrapper({ onViewItems }: { onViewItems?: () => void }) {
  const { parsedItems } = useImportWizard<ParsedGroceryItem>();

  return (
    <ImportComplete
      itemCount={parsedItems.length}
      onViewItems={onViewItems}
    />
  );
}
