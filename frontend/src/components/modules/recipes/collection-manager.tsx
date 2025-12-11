"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Plus,
  FolderOpen,
  Trash2,
  Pencil,
  MoreVertical,
  FolderPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import {
  useGetCollectionsQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  type RecipeCollection,
} from "@/lib/api/recipes-api";

// Predefined colors for collections
const COLLECTION_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
];

interface CollectionManagerProps {
  onSelectCollection?: (collection: RecipeCollection) => void;
  selectedCollectionId?: string | null;
}

export function CollectionManager({
  onSelectCollection,
  selectedCollectionId,
}: CollectionManagerProps) {
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  const { data: collections, isLoading } = useGetCollectionsQuery({
    include_archived: false,
  });
  const [createCollection, { isLoading: isCreating }] = useCreateCollectionMutation();
  const [updateCollection, { isLoading: isUpdating }] = useUpdateCollectionMutation();
  const [deleteCollection, { isLoading: isDeleting }] = useDeleteCollectionMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<RecipeCollection | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<RecipeCollection | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLLECTION_COLORS[0]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor(COLLECTION_COLORS[0]);
    setEditingCollection(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (collection: RecipeCollection) => {
    setEditingCollection(collection);
    setName(collection.name);
    setDescription(collection.description || "");
    setColor(collection.color || COLLECTION_COLORS[0]);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      if (editingCollection) {
        await updateCollection({
          id: editingCollection.id,
          data: { name: name.trim(), description: description.trim() || null, color },
        }).unwrap();
        toast.success(t("collections.updated"));
      } else {
        await createCollection({
          name: name.trim(),
          description: description.trim() || null,
          color,
        }).unwrap();
        toast.success(t("collections.created"));
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving collection:", error);
      toast.error(t("collections.errorSaving"));
    }
  };

  const handleDelete = async () => {
    if (!collectionToDelete) return;

    try {
      await deleteCollection(collectionToDelete.id).unwrap();
      toast.success(t("collections.deleted"));
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast.error(t("collections.errorDeleting"));
    }
  };

  const confirmDelete = (collection: RecipeCollection) => {
    setCollectionToDelete(collection);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-5 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("collections.title")}</h2>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("collections.create")}
        </Button>
      </div>

      {collections && collections.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                selectedCollectionId === collection.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onSelectCollection?.(collection)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: collection.color || COLLECTION_COLORS[0] }}
                    />
                    <CardTitle className="text-base">{collection.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(collection);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        {tCommon("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(collection);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {tCommon("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {collection.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {collection.description}
                    </p>
                  )}
                  <Badge variant="secondary">
                    {t("collections.recipeCount", { count: collection.recipe_count })}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title={t("collections.empty.title")}
          description={t("collections.empty.description")}
          action={{ label: t("collections.create"), onClick: handleOpenCreate }}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCollection
                ? t("collections.editTitle")
                : t("collections.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingCollection
                ? t("collections.editDescription")
                : t("collections.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("collections.name")}</label>
              <Input
                placeholder={t("collections.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("collections.description")}</label>
              <Textarea
                placeholder={t("collections.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("collections.color")}</label>
              <div className="flex flex-wrap gap-2">
                {COLLECTION_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-full transition-transform ${
                      color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || isCreating || isUpdating}
            >
              {isCreating || isUpdating
                ? tCommon("saving")
                : editingCollection
                ? tCommon("save")
                : t("collections.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("collections.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("collections.deleteDescription", {
                name: collectionToDelete?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? tCommon("deleting") : tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
