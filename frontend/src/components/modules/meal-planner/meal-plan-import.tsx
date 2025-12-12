"use client";

import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FileText, Mic, Camera } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";

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
  useCreateMealPlanMutation,
  useBulkCreateMealsMutation,
  useParseMealPlanTextMutation,
  useParseMealPlanVoiceMutation,
  useParseMealPlanImageMutation,
  MEAL_TYPES,
  type MealCreate,
  type MealType,
} from "@/lib/api/meal-planner-api";

// Parsed meal plan item for review table
export interface ParsedMealPlanItem extends ParsedItem {
  name: string;
  date_start: string;
  date_end: string;
  meals: ParsedMealItem[];
}

export interface ParsedMealItem {
  date: string;
  meal_type: MealType;
  recipe_name: string | null;
  custom_name: string | null;
  notes: string | null;
}

interface MealPlanImportProps {
  onComplete?: () => void;
  onViewItems?: () => void;
}

export function MealPlanImport({ onComplete, onViewItems }: MealPlanImportProps) {
  const t = useTranslations("import");
  const tMealPlanner = useTranslations("mealPlanner");

  const [createMealPlan] = useCreateMealPlanMutation();
  const [bulkCreateMeals] = useBulkCreateMealsMutation();
  const [parseMealPlanText] = useParseMealPlanTextMutation();
  const [parseMealPlanVoice] = useParseMealPlanVoiceMutation();
  const [parseMealPlanImage] = useParseMealPlanImageMutation();

  // Define available import methods for meal plans
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
        id: "photo",
        icon: <Camera className="h-6 w-6" />,
        titleKey: "methods.photo.title",
        descriptionKey: "methods.photo.mealPlanDescription",
      },
    ],
    []
  );

  // Define columns for the review table
  const columns: ColumnDefinition<ParsedMealPlanItem>[] = useMemo(
    () => [
      {
        key: "name",
        header: tMealPlanner("fields.name"),
        type: "text",
        width: "200px",
        required: true,
      },
      {
        key: "date_start",
        header: tMealPlanner("fields.startDate"),
        type: "text",
        width: "120px",
        required: true,
      },
      {
        key: "date_end",
        header: tMealPlanner("fields.endDate"),
        type: "text",
        width: "120px",
        required: true,
      },
      {
        key: "meals",
        header: tMealPlanner("fields.meals"),
        type: "text",
        width: "80px",
        render: (value: ParsedMealItem[]) => `${value?.length || 0}`,
      },
    ],
    [tMealPlanner]
  );

  // Generate a unique ID
  const generateId = () => {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get default start date (next Monday)
  const getDefaultStartDate = () => {
    const today = new Date();
    const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
    return format(nextMonday, "yyyy-MM-dd");
  };

  // Convert API response to ParsedMealPlanItem format
  const convertToParseItem = useCallback(
    (response: {
      name: string;
      date_start: string;
      date_end: string;
      meals: Array<{
        date: string;
        meal_type: MealType;
        recipe_name: string | null;
        custom_name: string | null;
        notes: string | null;
      }>;
    }): ParsedMealPlanItem[] => {
      return [{
        id: generateId(),
        name: response.name,
        date_start: response.date_start,
        date_end: response.date_end,
        meals: response.meals,
      }];
    },
    []
  );

  // Handle text parsing
  const handleParseText = useCallback(
    async (text: string): Promise<ParsedMealPlanItem[]> => {
      const startDate = getDefaultStartDate();
      const response = await parseMealPlanText({
        text,
        start_date: startDate,
        default_servings: 2,
      }).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to parse text");
      }

      return convertToParseItem(response);
    },
    [parseMealPlanText, convertToParseItem]
  );

  // Handle voice transcription and parsing
  const handleTranscribeAndParse = useCallback(
    async (audioBlob: Blob): Promise<ParsedMealPlanItem[]> => {
      // Determine file extension from MIME type
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
      formData.append("start_date", getDefaultStartDate());
      formData.append("default_servings", "2");

      const response = await parseMealPlanVoice(formData).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to transcribe audio");
      }

      return convertToParseItem(response);
    },
    [parseMealPlanVoice, convertToParseItem]
  );

  // Handle image parsing
  const handleParseImage = useCallback(
    async (file: File, _importType: PhotoImportType): Promise<ParsedMealPlanItem[]> => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("start_date", getDefaultStartDate());
      formData.append("default_servings", "2");

      const response = await parseMealPlanImage(formData).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to parse image");
      }

      return convertToParseItem(response);
    },
    [parseMealPlanImage, convertToParseItem]
  );

  // Handle saving items to the database
  const handleSave = useCallback(
    async (items: ParsedMealPlanItem[]) => {
      for (const item of items) {
        // Create the meal plan
        const mealPlan = await createMealPlan({
          name: item.name,
          date_start: item.date_start,
          date_end: item.date_end,
          servings: 2,
          is_template: false,
        }).unwrap();

        // Create meals in bulk
        if (item.meals.length > 0) {
          const mealsToCreate: MealCreate[] = item.meals.map((meal) => ({
            date: meal.date,
            meal_type: meal.meal_type,
            custom_name: meal.custom_name || meal.recipe_name,
            notes: meal.notes,
            is_leftover: false,
          }));

          await bulkCreateMeals({
            planId: mealPlan.id,
            meals: mealsToCreate,
          }).unwrap();
        }
      }

      onComplete?.();
    },
    [createMealPlan, bulkCreateMeals, onComplete]
  );

  // Example text for the text import
  const exampleText = t("text.mealPlanExample");

  return (
    <ImportWizardProvider<ParsedMealPlanItem>>
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
            exampleText={exampleText}
          />
        </ImportStepContent>

        {/* Step 3: Review parsed items */}
        <ImportStepContent step="review">
          <ImportReview<ParsedMealPlanItem>
            columns={columns}
            onSave={handleSave}
            itemNameKey="name"
            translationNamespace="mealPlanner.import"
          />
        </ImportStepContent>

        {/* Step 4: Complete */}
        <ImportStepContent step="complete">
          <ImportCompleteWrapper
            onViewItems={onViewItems}
            translationNamespace="mealPlanner.import"
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
  exampleText,
}: {
  onParseText: (text: string) => Promise<ParsedMealPlanItem[]>;
  onTranscribeAndParse: (blob: Blob) => Promise<ParsedMealPlanItem[]>;
  onParseImage: (file: File, importType: PhotoImportType) => Promise<ParsedMealPlanItem[]>;
  exampleText: string;
}) {
  const { selectedMethod } = useImportWizard<ParsedMealPlanItem>();
  const t = useTranslations("import");

  switch (selectedMethod) {
    case "text":
      return (
        <TextImport<ParsedMealPlanItem>
          onParse={onParseText}
          placeholder={t("text.mealPlanPlaceholder")}
          exampleText={exampleText}
        />
      );

    case "voice":
      return (
        <VoiceImport<ParsedMealPlanItem>
          onTranscribeAndParse={onTranscribeAndParse}
          maxDurationSeconds={180}
        />
      );

    case "photo":
      return (
        <PhotoImport<ParsedMealPlanItem>
          importType="meal_plan"
          onParseImage={onParseImage}
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
  const { parsedItems } = useImportWizard<ParsedMealPlanItem>();

  return (
    <ImportComplete
      itemCount={parsedItems.length}
      onViewItems={onViewItems}
      translationNamespace={translationNamespace}
    />
  );
}
