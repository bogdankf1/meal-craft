"use client";

import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Mic,
  Camera,
  Receipt,
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
  useCreateRestaurantMealsMutation,
  useParseRestaurantMealTextMutation,
  useParseRestaurantMealVoiceMutation,
  useParseRestaurantMealImageMutation,
  MEAL_TYPES,
  ORDER_TYPES,
  type CreateRestaurantMealInput,
  type MealType,
  type OrderType,
} from "@/lib/api/restaurants-api";

// Extend ParsedItem with restaurant meal specific fields
export interface ParsedRestaurantMeal extends ParsedItem {
  restaurant_name: string;
  meal_date: string;
  meal_time: string | null;
  meal_type: MealType;
  order_type: OrderType;
  items_ordered: string[] | null;
  description: string | null;
  estimated_calories: number | null;
  rating: number | null;
  feeling_after: number | null;
  tags: string[] | null;
  notes: string | null;
}

interface RestaurantMealImportProps {
  onComplete?: () => void;
  onViewItems?: () => void;
}

export function RestaurantMealImport({ onComplete, onViewItems }: RestaurantMealImportProps) {
  const t = useTranslations("import");
  const tRestaurants = useTranslations("restaurants");

  const [createMeals] = useCreateRestaurantMealsMutation();
  const [parseText] = useParseRestaurantMealTextMutation();
  const [parseVoice] = useParseRestaurantMealVoiceMutation();
  const [parseImage] = useParseRestaurantMealImageMutation();

  // Define available import methods for restaurant meals
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
        id: "photo_food",
        icon: <Camera className="h-6 w-6" />,
        titleKey: "methods.photoFood.title",
        descriptionKey: "methods.photoFood.description",
      },
      {
        id: "photo_receipt",
        icon: <Receipt className="h-6 w-6" />,
        titleKey: "methods.receipt.title",
        descriptionKey: "methods.receipt.description",
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
  const columns: ColumnDefinition<ParsedRestaurantMeal>[] = useMemo(
    () => [
      {
        key: "restaurant_name",
        header: tRestaurants("fields.restaurant"),
        type: "text",
        width: "160px",
        required: true,
      },
      {
        key: "meal_date",
        header: tRestaurants("fields.date"),
        type: "text",
        width: "120px",
        required: true,
      },
      {
        key: "meal_type",
        header: tRestaurants("fields.mealType"),
        type: "select",
        width: "120px",
        options: MEAL_TYPES.map((type) => ({
          value: type.value,
          label: tRestaurants(`mealTypes.${type.value}`),
        })),
      },
      {
        key: "order_type",
        header: tRestaurants("fields.orderType"),
        type: "select",
        width: "120px",
        options: ORDER_TYPES.map((type) => ({
          value: type.value,
          label: tRestaurants(`orderTypes.${type.value}`),
        })),
      },
      {
        key: "items_ordered",
        header: tRestaurants("fields.items"),
        type: "text",
        width: "180px",
        renderCell: (value: unknown) => {
          if (Array.isArray(value)) {
            return value.join(", ");
          }
          return (value as string) || "-";
        },
      },
    ],
    [tRestaurants]
  );

  // Generate a unique ID
  const generateId = () => {
    return crypto.randomUUID ? crypto.randomUUID() :
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Convert API response to ParsedRestaurantMeal format
  const convertToParseItem = useCallback(
    (items: CreateRestaurantMealInput[]): ParsedRestaurantMeal[] => {
      return items.map((item) => ({
        id: generateId(),
        restaurant_name: item.restaurant_name,
        meal_date: item.meal_date,
        meal_time: item.meal_time ?? null,
        meal_type: item.meal_type,
        order_type: item.order_type,
        items_ordered: item.items_ordered ?? null,
        description: item.description ?? null,
        estimated_calories: item.estimated_calories ?? null,
        rating: item.rating ?? null,
        feeling_after: item.feeling_after ?? null,
        tags: item.tags ?? null,
        notes: item.notes ?? null,
      }));
    },
    []
  );

  // Handle text parsing
  const handleParseText = useCallback(
    async (text: string): Promise<ParsedRestaurantMeal[]> => {
      const response = await parseText({
        text,
        default_date: new Date().toISOString().split("T")[0],
      }).unwrap();

      if (!response.success || !response.parsed_meals.length) {
        throw new Error(response.message || "Failed to parse text");
      }

      return convertToParseItem(response.parsed_meals);
    },
    [parseText, convertToParseItem]
  );

  // Handle voice transcription and parsing
  const handleTranscribeAndParse = useCallback(
    async (audioBlob: Blob): Promise<ParsedRestaurantMeal[]> => {
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
      formData.append("default_date", new Date().toISOString().split("T")[0]);

      const response = await parseVoice(formData).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to transcribe audio");
      }

      return convertToParseItem(response.parsed_meals);
    },
    [parseVoice, convertToParseItem]
  );

  // Handle image parsing
  const handleParseImage = useCallback(
    async (file: File, importType: PhotoImportType): Promise<ParsedRestaurantMeal[]> => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("import_type", importType);
      formData.append("default_date", new Date().toISOString().split("T")[0]);

      const response = await parseImage(formData).unwrap();

      if (!response.success || !response.parsed_meals.length) {
        throw new Error(response.message || "Failed to parse image");
      }

      return convertToParseItem(response.parsed_meals);
    },
    [parseImage, convertToParseItem]
  );

  // Handle multiple images parsing
  const handleParseMultipleImages = useCallback(
    async (files: File[], importType: PhotoImportType): Promise<ParsedRestaurantMeal[]> => {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("import_type", importType);
      formData.append("default_date", new Date().toISOString().split("T")[0]);

      const response = await parseImage(formData).unwrap();

      if (!response.success || !response.parsed_meals.length) {
        throw new Error(response.message || "Failed to parse images");
      }

      return convertToParseItem(response.parsed_meals);
    },
    [parseImage, convertToParseItem]
  );

  // Handle saving items to the database
  const handleSave = useCallback(
    async (items: ParsedRestaurantMeal[]) => {
      const mealInputs: CreateRestaurantMealInput[] = items.map((item) => ({
        restaurant_name: item.restaurant_name,
        meal_date: item.meal_date,
        meal_time: item.meal_time,
        meal_type: item.meal_type,
        order_type: item.order_type,
        items_ordered: item.items_ordered,
        description: item.description,
        estimated_calories: item.estimated_calories,
        rating: item.rating,
        feeling_after: item.feeling_after,
        tags: item.tags,
        notes: item.notes,
      }));

      await createMeals(mealInputs).unwrap();
      onComplete?.();
    },
    [createMeals, onComplete]
  );

  // Example text for the text import
  const exampleText = t("text.restaurantExample");

  return (
    <ImportWizardProvider<ParsedRestaurantMeal>>
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
          <ImportReview<ParsedRestaurantMeal>
            columns={columns}
            onSave={handleSave}
            itemNameKey="restaurant_name"
            saveButtonTextKey="review.addToRestaurants"
            descriptionKey="restaurants.review.description"
          />
        </ImportStepContent>

        {/* Step 4: Complete */}
        <ImportStepContent step="complete">
          <ImportCompleteWrapper
            onViewItems={onViewItems}
            descriptionKey="restaurants.complete.description"
            viewItemsKey="restaurants.complete.viewItems"
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
  onParseText: (text: string) => Promise<ParsedRestaurantMeal[]>;
  onTranscribeAndParse: (blob: Blob) => Promise<ParsedRestaurantMeal[]>;
  onParseImage: (file: File, type: PhotoImportType) => Promise<ParsedRestaurantMeal[]>;
  onParseMultipleImages: (files: File[], type: PhotoImportType) => Promise<ParsedRestaurantMeal[]>;
  exampleText: string;
}) {
  const { selectedMethod } = useImportWizard<ParsedRestaurantMeal>();
  const t = useTranslations("import");

  switch (selectedMethod) {
    case "text":
      return (
        <TextImport<ParsedRestaurantMeal>
          onParse={onParseText}
          placeholder={t("text.restaurantPlaceholder")}
          exampleText={exampleText}
        />
      );

    case "voice":
      return (
        <VoiceImport<ParsedRestaurantMeal>
          onTranscribeAndParse={onTranscribeAndParse}
          maxDurationSeconds={120}
        />
      );

    case "photo_food":
      return (
        <PhotoImport<ParsedRestaurantMeal>
          importType="food"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    case "photo_receipt":
      return (
        <PhotoImport<ParsedRestaurantMeal>
          importType="receipt"
          onParseImage={onParseImage}
          onParseMultipleImages={onParseMultipleImages}
        />
      );

    case "photo_app_screenshot":
      return (
        <PhotoImport<ParsedRestaurantMeal>
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
  descriptionKey,
  viewItemsKey,
}: {
  onViewItems?: () => void;
  descriptionKey?: string;
  viewItemsKey?: string;
}) {
  const { parsedItems } = useImportWizard<ParsedRestaurantMeal>();

  return (
    <ImportComplete
      itemCount={parsedItems.length}
      onViewItems={onViewItems}
      descriptionKey={descriptionKey}
      viewItemsKey={viewItemsKey}
    />
  );
}
