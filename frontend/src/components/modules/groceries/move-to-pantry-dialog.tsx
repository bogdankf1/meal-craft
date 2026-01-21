"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Package, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useMoveGroceryToPantryMutation,
  useBulkMoveGroceriesToPantryMutation,
  type StorageLocation,
  STORAGE_LOCATIONS,
} from "@/lib/api/pantry-api";

interface MoveToPantryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function MoveToPantryDialog({
  open,
  onOpenChange,
  items,
  onSuccess,
}: MoveToPantryDialogProps) {
  const t = useTranslations("groceries.moveToPantry");
  const tPantry = useTranslations("pantry");
  const tCommon = useTranslations("common");

  const [storageLocation, setStorageLocation] = useState<StorageLocation>("pantry");

  const [moveOne, { isLoading: isMovingOne }] = useMoveGroceryToPantryMutation();
  const [moveBulk, { isLoading: isMovingBulk }] = useBulkMoveGroceriesToPantryMutation();

  const isLoading = isMovingOne || isMovingBulk;
  const isBulk = items.length > 1;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // Reset state when dialog opens
      setStorageLocation("pantry");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    try {
      if (isBulk) {
        await moveBulk({
          ids: items.map((item) => item.id),
          storage_location: storageLocation,
        }).unwrap();
        toast.success(t("bulkSuccess", { count: items.length }));
      } else {
        await moveOne({
          groceryId: items[0].id,
          data: {
            storage_location: storageLocation,
          },
        }).unwrap();
        toast.success(t("success"));
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t("dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? t("dialogDescriptionBulk", { count: items.length })
              : t("dialogDescription", { name: items[0]?.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Items preview for bulk */}
          {isBulk && (
            <div className="rounded-md border p-3 bg-muted/50">
              <p className="text-sm font-medium mb-2">{t("itemsToMove")}:</p>
              <div className="flex flex-wrap gap-1">
                {items.slice(0, 5).map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-background text-xs"
                  >
                    {item.name}
                  </span>
                ))}
                {items.length > 5 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-background text-xs text-muted-foreground">
                    +{items.length - 5} {t("more")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Storage location selection */}
          <div className="space-y-3">
            <Label>{t("selectLocation")}</Label>
            <Select
              value={storageLocation}
              onValueChange={(value) => setStorageLocation(value as StorageLocation)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectLocationPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_LOCATIONS.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {tPantry(`storageLocations.${location.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("locationHint")}
            </p>
          </div>

          {/* Info message */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm">{t("moveExplanation")}</p>
          </div>
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
            disabled={isLoading}
          >
            {isLoading ? t("moving") : t("moveToPantry")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
