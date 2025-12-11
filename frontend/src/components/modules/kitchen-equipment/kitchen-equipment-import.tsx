"use client";

import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Mic,
  Camera,
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
  useCreateKitchenEquipmentMutation,
  useParseKitchenEquipmentTextMutation,
  useParseKitchenEquipmentVoiceMutation,
  useParseKitchenEquipmentImageMutation,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_LOCATIONS,
  type CreateKitchenEquipmentInput,
  type EquipmentCategory,
  type EquipmentCondition,
  type EquipmentLocation,
} from "@/lib/api/kitchen-equipment-api";

// Extend ParsedItem with kitchen equipment-specific fields
export interface ParsedEquipmentItem extends ParsedItem {
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  condition: string;
  location: string;
  purchase_price: number | null;
  maintenance_interval_days: number | null;
  notes: string | null;
}

interface KitchenEquipmentImportProps {
  onComplete?: () => void;
  onViewItems?: () => void;
}

export function KitchenEquipmentImport({ onComplete, onViewItems }: KitchenEquipmentImportProps) {
  const t = useTranslations("import");
  const tEquipment = useTranslations("kitchenEquipment");

  const [createEquipment] = useCreateKitchenEquipmentMutation();
  const [parseEquipmentText] = useParseKitchenEquipmentTextMutation();
  const [parseEquipmentVoice] = useParseKitchenEquipmentVoiceMutation();
  const [parseEquipmentImage] = useParseKitchenEquipmentImageMutation();

  // Define available import methods for kitchen equipment
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
        id: "photo_equipment",
        icon: <Camera className="h-6 w-6" />,
        titleKey: "methods.photoEquipment.title",
        descriptionKey: "methods.photoEquipment.description",
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
  const columns: ColumnDefinition<ParsedEquipmentItem>[] = useMemo(
    () => [
      {
        key: "name",
        header: tEquipment("fields.name"),
        type: "text",
        width: "180px",
        required: true,
      },
      {
        key: "category",
        header: tEquipment("fields.category"),
        type: "select",
        width: "140px",
        options: EQUIPMENT_CATEGORIES.map((cat) => ({
          value: cat.value,
          label: tEquipment(`categories.${cat.value}`),
        })),
      },
      {
        key: "brand",
        header: tEquipment("fields.brand"),
        type: "text",
        width: "120px",
      },
      {
        key: "model",
        header: tEquipment("fields.model"),
        type: "text",
        width: "120px",
      },
      {
        key: "condition",
        header: tEquipment("fields.condition"),
        type: "select",
        width: "120px",
        options: EQUIPMENT_CONDITIONS.map((cond) => ({
          value: cond.value,
          label: tEquipment(`conditions.${cond.value}`),
        })),
      },
      {
        key: "location",
        header: tEquipment("fields.location"),
        type: "select",
        width: "140px",
        options: EQUIPMENT_LOCATIONS.map((loc) => ({
          value: loc.value,
          label: tEquipment(`locations.${loc.value}`),
        })),
      },
    ],
    [tEquipment]
  );

  // Generate a unique ID
  const generateId = () => {
    return crypto.randomUUID ? crypto.randomUUID() :
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Convert API response to ParsedEquipmentItem format
  const convertToParseItem = useCallback(
    (items: CreateKitchenEquipmentInput[]): ParsedEquipmentItem[] => {
      return items.map((item) => ({
        id: generateId(),
        name: item.name,
        category: item.category ?? null,
        brand: item.brand ?? null,
        model: item.model ?? null,
        condition: item.condition || "good",
        location: item.location || "cabinet",
        purchase_price: item.purchase_price ?? null,
        maintenance_interval_days: item.maintenance_interval_days ?? null,
        notes: item.notes ?? null,
      }));
    },
    []
  );

  // Handle text parsing
  const handleParseText = useCallback(
    async (text: string): Promise<ParsedEquipmentItem[]> => {
      const response = await parseEquipmentText({
        text,
      }).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse text");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseEquipmentText, convertToParseItem]
  );

  // Handle voice transcription and parsing
  const handleTranscribeAndParse = useCallback(
    async (audioBlob: Blob): Promise<ParsedEquipmentItem[]> => {
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

      const formData = new FormData();
      formData.append("audio", audioBlob, filename);
      formData.append("language", "auto");

      const response = await parseEquipmentVoice(formData).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to transcribe audio");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseEquipmentVoice, convertToParseItem]
  );

  // Handle image parsing
  const handleParseImage = useCallback(
    async (file: File, importType: PhotoImportType): Promise<ParsedEquipmentItem[]> => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("import_type", importType);

      const response = await parseEquipmentImage(formData).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse image");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseEquipmentImage, convertToParseItem]
  );

  // Handle multiple images parsing
  const handleParseMultipleImages = useCallback(
    async (files: File[], importType: PhotoImportType): Promise<ParsedEquipmentItem[]> => {
      const formData = new FormData();

      // Append all images
      files.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("import_type", importType);

      const response = await parseEquipmentImage(formData).unwrap();

      if (!response.success || !response.parsed_items.length) {
        throw new Error(response.message || "Failed to parse images");
      }

      return convertToParseItem(response.parsed_items);
    },
    [parseEquipmentImage, convertToParseItem]
  );

  // Handle saving items to the database
  const handleSave = useCallback(
    async (items: ParsedEquipmentItem[]) => {
      const equipmentInputs: CreateKitchenEquipmentInput[] = items.map((item) => ({
        name: item.name,
        category: item.category as EquipmentCategory | undefined,
        brand: item.brand,
        model: item.model,
        condition: item.condition as EquipmentCondition,
        location: item.location as EquipmentLocation,
        purchase_price: item.purchase_price,
        maintenance_interval_days: item.maintenance_interval_days,
        notes: item.notes,
      }));

      await createEquipment(equipmentInputs).unwrap();
      onComplete?.();
    },
    [createEquipment, onComplete]
  );

  // Example text for the text import
  const exampleText = t("text.equipmentExample");

  return (
    <ImportWizardProvider<ParsedEquipmentItem>>
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
          <ImportReview<ParsedEquipmentItem>
            columns={columns}
            onSave={handleSave}
            itemNameKey="name"
            translationNamespace="kitchenEquipment.import"
          />
        </ImportStepContent>

        {/* Step 4: Complete */}
        <ImportStepContent step="complete">
          <ImportCompleteWrapper
            onViewItems={onViewItems}
            translationNamespace="kitchenEquipment.import"
          />
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
  onParseText: (text: string) => Promise<ParsedEquipmentItem[]>;
  onTranscribeAndParse: (blob: Blob) => Promise<ParsedEquipmentItem[]>;
  onParseImage: (file: File, type: PhotoImportType) => Promise<ParsedEquipmentItem[]>;
  onParseMultipleImages: (files: File[], type: PhotoImportType) => Promise<ParsedEquipmentItem[]>;
  exampleText: string;
}) {
  const { selectedMethod } = useImportWizard<ParsedEquipmentItem>();
  const t = useTranslations("import");

  switch (selectedMethod) {
    case "text":
      return (
        <TextImport<ParsedEquipmentItem>
          onParse={onParseText}
          placeholder={t("text.equipmentPlaceholder")}
          exampleText={exampleText}
        />
      );

    case "voice":
      return (
        <VoiceImport<ParsedEquipmentItem>
          onTranscribeAndParse={onTranscribeAndParse}
          maxDurationSeconds={120}
        />
      );

    case "photo_equipment":
      return (
        <PhotoImport<ParsedEquipmentItem>
          importType="equipment"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    case "photo_app_screenshot":
      return (
        <PhotoImport<ParsedEquipmentItem>
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
function ImportCompleteWrapper({
  onViewItems,
  translationNamespace,
}: {
  onViewItems?: () => void;
  translationNamespace?: string;
}) {
  const { parsedItems } = useImportWizard<ParsedEquipmentItem>();

  return (
    <ImportComplete
      itemCount={parsedItems.length}
      onViewItems={onViewItems}
      translationNamespace={translationNamespace}
    />
  );
}
