"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Plus, AlertTriangle, ThumbsDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  useGetDietaryRestrictionsQuery,
  useCreateDietaryRestrictionMutation,
  useDeleteDietaryRestrictionMutation,
  type RestrictionType,
} from "@/lib/api/dietary-restrictions-api";
import { type Profile } from "@/lib/api/profiles-api";

// Common allergens for quick add
const COMMON_ALLERGENS = [
  "Peanuts",
  "Tree nuts",
  "Milk",
  "Eggs",
  "Wheat",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame",
  "Gluten",
];

interface DietaryRestrictionsEditorProps {
  profile: Profile;
}

export function DietaryRestrictionsEditor({ profile }: DietaryRestrictionsEditorProps) {
  const t = useTranslations("dietaryRestrictions");
  const tCommon = useTranslations("common");

  // State
  const [newIngredient, setNewIngredient] = useState("");
  const [newType, setNewType] = useState<RestrictionType>("allergy");

  // API
  const { data, isLoading } = useGetDietaryRestrictionsQuery({ profileId: profile.id });
  const [createRestriction, { isLoading: isCreating }] = useCreateDietaryRestrictionMutation();
  const [deleteRestriction] = useDeleteDietaryRestrictionMutation();

  const restrictions = data?.restrictions || [];
  const allergies = restrictions.filter((r) => r.restriction_type === "allergy");
  const dislikes = restrictions.filter((r) => r.restriction_type === "dislike");

  const handleAddRestriction = async (ingredientName?: string) => {
    const ingredient = ingredientName || newIngredient.trim();
    if (!ingredient) {
      toast.error(t("messages.ingredientRequired"));
      return;
    }

    // Check if already exists
    const exists = restrictions.some(
      (r) => r.ingredient_name.toLowerCase() === ingredient.toLowerCase()
    );
    if (exists) {
      toast.error(t("messages.alreadyExists"));
      return;
    }

    try {
      await createRestriction({
        profile_id: profile.id,
        ingredient_name: ingredient,
        restriction_type: newType,
      }).unwrap();
      setNewIngredient("");
      toast.success(t("messages.added"));
    } catch {
      toast.error(t("messages.addError"));
    }
  };

  const handleDeleteRestriction = async (id: string) => {
    try {
      await deleteRestriction(id).unwrap();
      toast.success(t("messages.removed"));
    } catch {
      toast.error(t("messages.removeError"));
    }
  };

  const handleQuickAdd = (ingredient: string) => {
    handleAddRestriction(ingredient);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new restriction */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            placeholder={t("addPlaceholder")}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddRestriction();
              }
            }}
          />
          <Select value={newType} onValueChange={(v) => setNewType(v as RestrictionType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allergy">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  {t("types.allergy")}
                </span>
              </SelectItem>
              <SelectItem value="dislike">
                <span className="flex items-center gap-2">
                  <ThumbsDown className="h-3 w-3 text-muted-foreground" />
                  {t("types.dislike")}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleAddRestriction()} disabled={isCreating}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick add common allergens */}
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1">{t("quickAdd")}:</span>
          {COMMON_ALLERGENS.filter(
            (a) => !restrictions.some((r) => r.ingredient_name.toLowerCase() === a.toLowerCase())
          )
            .slice(0, 6)
            .map((allergen) => (
              <Badge
                key={allergen}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 text-xs"
                onClick={() => handleQuickAdd(allergen)}
              >
                + {allergen}
              </Badge>
            ))}
        </div>
      </div>

      {/* Allergies section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {t("allergiesTitle")}
          <span className="text-muted-foreground font-normal">({allergies.length})</span>
        </div>
        {allergies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allergies.map((restriction) => (
              <Badge
                key={restriction.id}
                variant="destructive"
                className="pl-2 pr-1 py-1 flex items-center gap-1"
              >
                {restriction.ingredient_name}
                <button
                  onClick={() => handleDeleteRestriction(restriction.id)}
                  className="ml-1 hover:bg-white/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noAllergies")}</p>
        )}
      </div>

      {/* Dislikes section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ThumbsDown className="h-4 w-4 text-muted-foreground" />
          {t("dislikesTitle")}
          <span className="text-muted-foreground font-normal">({dislikes.length})</span>
        </div>
        {dislikes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dislikes.map((restriction) => (
              <Badge
                key={restriction.id}
                variant="secondary"
                className="pl-2 pr-1 py-1 flex items-center gap-1"
              >
                {restriction.ingredient_name}
                <button
                  onClick={() => handleDeleteRestriction(restriction.id)}
                  className="ml-1 hover:bg-black/10 dark:hover:bg-white/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noDislikes")}</p>
        )}
      </div>
    </div>
  );
}
