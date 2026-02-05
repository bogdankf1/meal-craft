"use client";

import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FileText, Mic, Link2, Camera } from "lucide-react";

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
  useCreateRecipesMutation,
  useParseRecipeTextMutation,
  useParseRecipeVoiceMutation,
  useParseRecipeUrlMutation,
  useParseRecipeImageMutation,
  RECIPE_CATEGORIES,
  RECIPE_DIFFICULTIES,
  type CreateRecipeInput,
  type RecipeCategory,
  type RecipeDifficulty,
} from "@/lib/api/recipes-api";
import { UrlImport } from "./url-import";

// Extend ParsedItem with recipe-specific fields
export interface ParsedRecipeItem extends ParsedItem {
  name: string;
  description: string | null;
  category: string | null;
  cuisine_type: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number;
  difficulty: string | null;
  instructions: string;
  source: string | null;
  source_url: string | null;
  notes: string | null;
  ingredients: Array<{
    ingredient_name: string;
    quantity: number | null;
    unit: string | null;
    category: string | null;
  }>;
}

interface RecipeImportProps {
  onComplete?: () => void;
  onViewItems?: () => void;
  initialAiQuery?: string; // Pre-fill AI text import with this query
}

export function RecipeImport({ onComplete, onViewItems, initialAiQuery }: RecipeImportProps) {
  const t = useTranslations("import");
  const tRecipes = useTranslations("recipes");

  const [createRecipes] = useCreateRecipesMutation();
  const [parseRecipeText] = useParseRecipeTextMutation();
  const [parseRecipeVoice] = useParseRecipeVoiceMutation();
  const [parseRecipeUrl] = useParseRecipeUrlMutation();
  const [parseRecipeImage] = useParseRecipeImageMutation();

  // Define available import methods for recipes
  // Primary methods (url and photo) are displayed more prominently
  const importMethods: ImportMethod[] = useMemo(
    () => [
      {
        id: "url",
        icon: <Link2 className="h-6 w-6" />,
        titleKey: "methods.url.title",
        descriptionKey: "methods.url.description",
        primary: true,
      },
      {
        id: "photo",
        icon: <Camera className="h-6 w-6" />,
        titleKey: "methods.photo.title",
        descriptionKey: "methods.photo.recipeDescription",
        primary: true,
      },
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
    ],
    []
  );

  // Define columns for the review table
  const columns: ColumnDefinition<ParsedRecipeItem>[] = useMemo(
    () => [
      {
        key: "name",
        header: tRecipes("fields.name"),
        type: "text",
        width: "200px",
        required: true,
      },
      {
        key: "category",
        header: tRecipes("fields.category"),
        type: "select",
        width: "130px",
        options: RECIPE_CATEGORIES.map((cat) => ({
          value: cat.value,
          label: tRecipes(`categories.${cat.value}`),
        })),
      },
      {
        key: "cuisine_type",
        header: tRecipes("fields.cuisine"),
        type: "text",
        width: "120px",
      },
      {
        key: "difficulty",
        header: tRecipes("fields.difficulty"),
        type: "select",
        width: "100px",
        options: RECIPE_DIFFICULTIES.map((diff) => ({
          value: diff.value,
          label: tRecipes(`difficulties.${diff.value}`),
        })),
      },
      {
        key: "servings",
        header: tRecipes("fields.servings"),
        type: "number",
        width: "80px",
      },
      {
        key: "prep_time",
        header: tRecipes("fields.prepTime"),
        type: "number",
        width: "80px",
      },
      {
        key: "cook_time",
        header: tRecipes("fields.cookTime"),
        type: "number",
        width: "80px",
      },
    ],
    [tRecipes]
  );

  // Generate a unique ID
  const generateId = () => {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Convert API response to ParsedRecipeItem format
  const convertToParseItem = useCallback(
    (items: CreateRecipeInput[]): ParsedRecipeItem[] => {
      return items.map((item) => ({
        id: generateId(),
        name: item.name,
        description: item.description ?? null,
        category: item.category ?? null,
        cuisine_type: item.cuisine_type ?? null,
        prep_time: item.prep_time ?? null,
        cook_time: item.cook_time ?? null,
        servings: item.servings || 4,
        difficulty: item.difficulty ?? null,
        instructions: item.instructions,
        source: item.source ?? null,
        source_url: item.source_url ?? null,
        notes: item.notes ?? null,
        ingredients: item.ingredients.map((ing) => ({
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          category: ing.category ?? null,
        })),
      }));
    },
    []
  );

  // Handle text parsing
  const handleParseText = useCallback(
    async (text: string): Promise<ParsedRecipeItem[]> => {
      const response = await parseRecipeText({
        text,
      }).unwrap();

      if (!response.success || !response.parsed_recipes.length) {
        throw new Error(response.message || "Failed to parse text");
      }

      return convertToParseItem(response.parsed_recipes);
    },
    [parseRecipeText, convertToParseItem]
  );

  // Handle voice transcription and parsing
  const handleTranscribeAndParse = useCallback(
    async (audioBlob: Blob): Promise<ParsedRecipeItem[]> => {
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

      const response = await parseRecipeVoice(formData).unwrap();

      if (!response.success) {
        throw new Error(response.message || "Failed to transcribe audio");
      }

      return convertToParseItem(response.parsed_recipes);
    },
    [parseRecipeVoice, convertToParseItem]
  );

  // Handle URL parsing
  const handleParseUrl = useCallback(
    async (url: string): Promise<ParsedRecipeItem[]> => {
      const response = await parseRecipeUrl({ url }).unwrap();

      if (!response.success || !response.parsed_recipes.length) {
        throw new Error(response.message || "Failed to parse URL");
      }

      return convertToParseItem(response.parsed_recipes);
    },
    [parseRecipeUrl, convertToParseItem]
  );

  // Handle image parsing (handwriting, photos)
  const handleParseImage = useCallback(
    async (file: File, _importType: PhotoImportType): Promise<ParsedRecipeItem[]> => {
      const formData = new FormData();
      formData.append("image", file);

      const response = await parseRecipeImage(formData).unwrap();

      if (!response.success || !response.parsed_recipes.length) {
        throw new Error(response.message || "Failed to parse image");
      }

      return convertToParseItem(response.parsed_recipes);
    },
    [parseRecipeImage, convertToParseItem]
  );

  // Handle saving items to the database
  const handleSave = useCallback(
    async (items: ParsedRecipeItem[]) => {
      const recipeInputs: CreateRecipeInput[] = items.map((item) => ({
        name: item.name,
        description: item.description,
        category: item.category as RecipeCategory | undefined,
        cuisine_type: item.cuisine_type,
        prep_time: item.prep_time,
        cook_time: item.cook_time,
        servings: item.servings,
        difficulty: item.difficulty as RecipeDifficulty | undefined,
        instructions: item.instructions,
        source: item.source,
        source_url: item.source_url,
        notes: item.notes,
        ingredients: item.ingredients,
      }));

      await createRecipes(recipeInputs).unwrap();
      onComplete?.();
    },
    [createRecipes, onComplete]
  );

  // Example text for the text import
  const exampleText = t("text.recipeExample");

  // Determine initial step based on whether we have an AI query
  const hasInitialQuery = Boolean(initialAiQuery);

  return (
    <ImportWizardProvider<ParsedRecipeItem>
      initialMethod={hasInitialQuery ? "text" : undefined}
      initialStep={hasInitialQuery ? "input" : "method"}
    >
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
            onParseUrl={handleParseUrl}
            onParseImage={handleParseImage}
            exampleText={exampleText}
            initialAiQuery={initialAiQuery}
          />
        </ImportStepContent>

        {/* Step 3: Review parsed items */}
        <ImportStepContent step="review">
          <ImportReview<ParsedRecipeItem>
            columns={columns}
            onSave={handleSave}
            itemNameKey="name"
            translationNamespace="recipes.import"
          />
        </ImportStepContent>

        {/* Step 4: Complete */}
        <ImportStepContent step="complete">
          <ImportCompleteWrapper
            onViewItems={onViewItems}
            translationNamespace="recipes.import"
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
  onParseUrl,
  onParseImage,
  exampleText,
  initialAiQuery,
}: {
  onParseText: (text: string) => Promise<ParsedRecipeItem[]>;
  onTranscribeAndParse: (blob: Blob) => Promise<ParsedRecipeItem[]>;
  onParseUrl: (url: string) => Promise<ParsedRecipeItem[]>;
  onParseImage: (file: File, importType: PhotoImportType) => Promise<ParsedRecipeItem[]>;
  exampleText: string;
  initialAiQuery?: string;
}) {
  const { selectedMethod } = useImportWizard<ParsedRecipeItem>();
  const t = useTranslations("import");

  switch (selectedMethod) {
    case "text":
      return (
        <TextImport<ParsedRecipeItem>
          onParse={onParseText}
          placeholder={t("text.recipePlaceholder")}
          exampleText={exampleText}
          initialText={initialAiQuery}
        />
      );

    case "voice":
      return (
        <VoiceImport<ParsedRecipeItem>
          onTranscribeAndParse={onTranscribeAndParse}
          maxDurationSeconds={180}
        />
      );

    case "photo":
      return (
        <PhotoImport<ParsedRecipeItem>
          importType="recipe_handwriting"
          onParseImage={onParseImage}
        />
      );

    case "url":
      return <UrlImport onParseUrl={onParseUrl} />;

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
  const { parsedItems } = useImportWizard<ParsedRecipeItem>();

  return (
    <ImportComplete
      itemCount={parsedItems.length}
      onViewItems={onViewItems}
      translationNamespace={translationNamespace}
    />
  );
}
