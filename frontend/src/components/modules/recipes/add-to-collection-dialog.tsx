"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, FolderOpen, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useAddRecipesToCollectionMutation,
} from "@/lib/api/recipes-api";

// Predefined colors for new collections
const COLLECTION_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface AddToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeIds: string[];
  recipeNames?: string[];
  onSuccess?: () => void;
}

export function AddToCollectionDialog({
  open,
  onOpenChange,
  recipeIds,
  recipeNames = [],
  onSuccess,
}: AddToCollectionDialogProps) {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [createNew, setCreateNew] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState(COLLECTION_COLORS[0]);

  const { data: collections, isLoading: isLoadingCollections } = useGetCollectionsQuery({
    include_archived: false,
  });

  const [createCollection, { isLoading: isCreating }] = useCreateCollectionMutation();
  const [addRecipes, { isLoading: isAdding }] = useAddRecipesToCollectionMutation();

  const isLoading = isCreating || isAdding;

  // Handle dialog open/close with state reset
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedCollectionId("");
      setCreateNew(false);
      setNewCollectionName("");
      setNewCollectionColor(COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)]);
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    try {
      let targetCollectionId = selectedCollectionId;

      // Create new collection if needed
      if (createNew) {
        if (!newCollectionName.trim()) {
          toast.error(t("addToCollection.enterName"));
          return;
        }
        const newCollection = await createCollection({
          name: newCollectionName.trim(),
          color: newCollectionColor,
        }).unwrap();
        targetCollectionId = newCollection.id;
      }

      if (!targetCollectionId) {
        toast.error(t("addToCollection.selectOrCreate"));
        return;
      }

      // Add recipes to the collection
      await addRecipes({
        collectionId: targetCollectionId,
        recipeIds,
      }).unwrap();

      toast.success(t("addToCollection.success", { count: recipeIds.length }));
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("addToCollection.error"));
      console.error("Error adding to collection:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t("addToCollection.title")}
          </DialogTitle>
          <DialogDescription>
            {t("addToCollection.description", { count: recipeIds.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipes preview */}
          {recipeNames.length > 0 && (
            <div className="rounded-md border p-3 bg-muted/50">
              <p className="text-sm font-medium mb-2">{t("addToCollection.recipesToAdd")}:</p>
              <div className="flex flex-wrap gap-1">
                {recipeNames.slice(0, 5).map((name, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-background text-xs"
                  >
                    {name}
                  </span>
                ))}
                {recipeNames.length > 5 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-background text-xs text-muted-foreground">
                    +{recipeNames.length - 5} {t("addToCollection.more")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Collection selection */}
          <div className="space-y-3">
            <Label>{t("addToCollection.selectCollection")}</Label>

            {isLoadingCollections ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                {tCommon("loading")}
              </div>
            ) : (
              <RadioGroup
                value={createNew ? "new" : selectedCollectionId}
                onValueChange={(value) => {
                  if (value === "new") {
                    setCreateNew(true);
                    setSelectedCollectionId("");
                  } else {
                    setCreateNew(false);
                    setSelectedCollectionId(value);
                  }
                }}
              >
                <ScrollArea className="h-[200px] rounded-md border p-2">
                  <div className="space-y-2">
                    {/* Create new collection option */}
                    <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                      <RadioGroupItem value="new" id="new-collection" />
                      <Label
                        htmlFor="new-collection"
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <Plus className="h-4 w-4 text-primary" />
                        <span className="text-primary font-medium">
                          {t("addToCollection.createNew")}
                        </span>
                      </Label>
                    </div>

                    {collections && collections.length > 0 && (
                      <div className="border-t my-2" />
                    )}

                    {/* Existing collections */}
                    {collections?.map((collection) => (
                      <div
                        key={collection.id}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted"
                      >
                        <RadioGroupItem value={collection.id} id={collection.id} />
                        <Label
                          htmlFor={collection.id}
                          className="flex items-center justify-between cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: collection.color || COLLECTION_COLORS[0] }}
                            />
                            <span>{collection.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {collection.recipe_count} {t("addToCollection.recipes")}
                          </span>
                        </Label>
                      </div>
                    ))}

                    {(!collections || collections.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("addToCollection.noCollections")}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </RadioGroup>
            )}
          </div>

          {/* New collection inputs */}
          {createNew && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-collection-name">{t("addToCollection.newName")}</Label>
                <Input
                  id="new-collection-name"
                  placeholder={t("collections.namePlaceholder")}
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>{t("addToCollection.color")}</Label>
                <div className="flex flex-wrap gap-2">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded-full transition-transform ${
                        newCollectionColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewCollectionColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (!selectedCollectionId && !createNew) || (createNew && !newCollectionName.trim())}
          >
            {isLoading ? (
              t("addToCollection.adding")
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t("addToCollection.addButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
