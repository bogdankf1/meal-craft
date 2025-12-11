"use client";

import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Mic,
  Camera,
  ClipboardList,
  Smartphone,
} from "lucide-react";

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
  useCreatePantryItemsMutation,
  useParsePantryTextMutation,
  useParsePantryVoiceMutation,
  useParsePantryImageMutation,
  PANTRY_CATEGORIES,
  STORAGE_LOCATIONS,
  type CreatePantryItemInput,
  type PantryCategory,
  type StorageLocation,
} from "@/lib/api/pantry-api";

// Extend ParsedItem with pantry-specific fields
export interface ParsedPantryItem extends ParsedItem {
  item_name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  storage_location: StorageLocation;
  expiry_date: string | null;
  opened_date: string | null;
  minimum_quantity: number | null;
  notes: string | null;
}

interface PantryImportProps {
  onComplete?: () => void;
  onViewItems?: () => void;
}

export function PantryImport({ onComplete, onViewItems }: PantryImportProps) {
  const t = useTranslations("import");
  const tPantry = useTranslations("pantry");

  const [createPantryItems] = useCreatePantryItemsMutation();
  const [parsePantryText] = useParsePantryTextMutation();
  const [parsePantryVoice] = useParsePantryVoiceMutation();
  const [parsePantryImage] = useParsePantryImageMutation();

  // Define available import methods for pantry
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
        id: "photo_pantry",
        icon: <Camera className="h-6 w-6" />,
        titleKey: "methods.photoPantry.title",
        descriptionKey: "methods.photoPantry.description",
      },
      {
        id: "photo_paper_list",
        icon: <ClipboardList className="h-6 w-6" />,
        titleKey: "methods.paperList.title",
        descriptionKey: "methods.paperList.description",
      },
      {
        id: "photo_app_screenshot",
        icon: <Smartphone className="h-6 w-6" />,
        titleKey: "methods.appScreenshot.title",
        descriptionKey: "methods.appScreenshot.description",
      },
    ],
    []
  );

  // Define columns for the review table
  const columns: ColumnDefinition<ParsedPantryItem>[] = useMemo(
    () => [
      {
        key: "item_name",
        header: tPantry("fields.itemName"),
        type: "text",
        width: "180px",
        required: true,
      },
      {
        key: "storage_location",
        header: tPantry("fields.storageLocation"),
        type: "select",
        width: "120px",
        options: STORAGE_LOCATIONS.map((loc) => ({
          value: loc.value,
          label: tPantry(`storageLocations.${loc.value}`),
        })),
      },
      {
        key: "quantity",
        header: tPantry("fields.quantity"),
        type: "number",
        width: "80px",
      },
      {
        key: "unit",
        header: tPantry("fields.unit"),
        type: "text",
        width: "80px",
      },
      {
        key: "category",
        header: tPantry("fields.category"),
        type: "select",
        width: "120px",
        options: PANTRY_CATEGORIES.map((cat) => ({
          value: cat.value,
          label: tPantry(`categories.${cat.value}`),
        })),
      },
      {
        key: "expiry_date",
        header: tPantry("fields.expiryDate"),
        type: "text",
        width: "120px",
      },
    ],
    [tPantry]
  );

  // Generate a unique ID
  const generateId = () => {
    return crypto.randomUUID ? crypto.randomUUID() :
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Convert API response to ParsedPantryItem format
  const convertToParseItem = useCallback(
    (items: CreatePantryItemInput[]): ParsedPantryItem[] => {
      return items.map((item) => ({
        id: generateId(),
        item_name: item.item_name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        category: item.category ?? null,
        storage_location: item.storage_location || "pantry",
        expiry_date: item.expiry_date ?? null,
        opened_date: item.opened_date ?? null,
        minimum_quantity: item.minimum_quantity ?? null,
        notes: item.notes ?? null,
      }));
    },
    []
  );

  // Handle text parsing
  const handleParseText = useCallback(
    async (text: string): Promise<ParsedPantryItem[]> => {
      const response = await parsePantryText({
        text,
      }).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse text");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parsePantryText, convertToParseItem]
  );

  // Handle voice transcription and parsing
  const handleTranscribeAndParse = useCallback(
    async (audioBlob: Blob): Promise<ParsedPantryItem[]> => {
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

      console.log('[PantryImport] Sending audio:', {
        type: audioBlob.type,
        size: audioBlob.size,
        filename,
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      formData.append("language", "auto"); // Auto-detect language

      const response = await parsePantryVoice(formData).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to transcribe audio");
      }

      // Return empty array if no items found - the review step will handle this
      return convertToParseItem(response.parsed_items);
    },
    [parsePantryVoice, convertToParseItem]
  );

  // Handle image parsing
  const handleParseImage = useCallback(
    async (file: File, importType: PhotoImportType): Promise<ParsedPantryItem[]> => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("import_type", importType);

      const response = await parsePantryImage(formData).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse image");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parsePantryImage, convertToParseItem]
  );

  // Handle multiple images parsing
  const handleParseMultipleImages = useCallback(
    async (files: File[], importType: PhotoImportType): Promise<ParsedPantryItem[]> => {
      const formData = new FormData();

      // Append all images
      files.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("import_type", importType);

      const response = await parsePantryImage(formData).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse images");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parsePantryImage, convertToParseItem]
  );

  // Handle saving items to the database
  const handleSave = useCallback(
    async (items: ParsedPantryItem[]) => {
      const pantryInputs: CreatePantryItemInput[] = items.map((item) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category as PantryCategory | undefined,
        storage_location: item.storage_location,
        expiry_date: item.expiry_date,
        opened_date: item.opened_date,
        minimum_quantity: item.minimum_quantity,
        notes: item.notes,
      }));

      await createPantryItems(pantryInputs).unwrap();
      onComplete?.();
    },
    [createPantryItems, onComplete]
  );

  // Example text for the text import
  const exampleText = t("text.pantryExample");

  return (
    <ImportWizardProvider<ParsedPantryItem>>
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
            exampleText={exampleText}
          />
        </ImportStepContent>

        {/* Step 3: Review parsed items */}
        <ImportStepContent step="review">
          <ImportReview<ParsedPantryItem>
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
  exampleText,
}: {
  onParseText: (text: string) => Promise<ParsedPantryItem[]>;
  onTranscribeAndParse: (blob: Blob) => Promise<ParsedPantryItem[]>;
  onParseImage: (file: File, type: PhotoImportType) => Promise<ParsedPantryItem[]>;
  onParseMultipleImages: (files: File[], type: PhotoImportType) => Promise<ParsedPantryItem[]>;
  exampleText: string;
}) {
  const { selectedMethod } = useImportWizard<ParsedPantryItem>();
  const t = useTranslations("import");

  switch (selectedMethod) {
    case "text":
      return (
        <TextImport<ParsedPantryItem>
          onParse={onParseText}
          placeholder={t("text.pantryPlaceholder")}
          exampleText={exampleText}
        />
      );

    case "voice":
      return (
        <VoiceImport<ParsedPantryItem>
          onTranscribeAndParse={onTranscribeAndParse}
          maxDurationSeconds={120}
        />
      );

    case "photo_pantry":
      return (
        <PhotoImport<ParsedPantryItem>
          importType="pantry"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    case "photo_paper_list":
      return (
        <PhotoImport<ParsedPantryItem>
          importType="paper_list"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    case "photo_app_screenshot":
      return (
        <PhotoImport<ParsedPantryItem>
          importType="app_screenshot"
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
  const { parsedItems } = useImportWizard<ParsedPantryItem>();

  return (
    <ImportComplete
      itemCount={parsedItems.length}
      onViewItems={onViewItems}
    />
  );
}
