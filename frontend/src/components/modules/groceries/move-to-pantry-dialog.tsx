"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Package, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  getStorageLocationForCategory,
} from "@/lib/api/pantry-api";

interface MoveToPantryItem {
  id: string;
  name: string;
  category: string | null;
}

interface MoveToPantryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MoveToPantryItem[];
  onSuccess?: () => void;
}

// Storage location icons/colors for visual distinction
const locationStyles: Record<StorageLocation, string> = {
  fridge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  freezer: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  pantry: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  spice_rack: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

export function MoveToPantryDialog({
  open,
  onOpenChange,
  items,
  onSuccess,
}: MoveToPantryDialogProps) {
  const t = useTranslations("groceries.moveToPantry");
  const tPantry = useTranslations("pantry");
  const tCommon = useTranslations("common");

  // Track user overrides for storage locations (defaults are computed)
  const [locationOverrides, setLocationOverrides] = useState<Record<string, StorageLocation>>({});
  // Track which items we've seen to know when to reset overrides
  const [itemsKey, setItemsKey] = useState<string>("");

  const [moveOne, { isLoading: isMovingOne }] = useMoveGroceryToPantryMutation();
  const [moveBulk, { isLoading: isMovingBulk }] = useBulkMoveGroceriesToPantryMutation();

  const isLoading = isMovingOne || isMovingBulk;
  const isBulk = items.length > 1;

  // Calculate default storage locations
  const defaultLocations = useMemo(() => {
    const locations: Record<string, StorageLocation> = {};
    items.forEach((item) => {
      locations[item.id] = getStorageLocationForCategory(item.category);
    });
    return locations;
  }, [items]);

  // Create a key from item IDs to detect changes
  const currentItemsKey = useMemo(() => items.map(i => i.id).sort().join(","), [items]);

  // Reset overrides when items change (compare keys to avoid effect)
  if (currentItemsKey !== itemsKey) {
    setItemsKey(currentItemsKey);
    setLocationOverrides({});
  }

  // Merge defaults with overrides
  const itemLocations = useMemo(() => ({
    ...defaultLocations,
    ...locationOverrides,
  }), [defaultLocations, locationOverrides]);

  // Helper to update a location (sets an override)
  const setItemLocation = (itemId: string, location: StorageLocation) => {
    setLocationOverrides(prev => ({ ...prev, [itemId]: location }));
  };

  // Group items by their storage location for display
  const locationGroups = useMemo(() => {
    const groups: Record<StorageLocation, MoveToPantryItem[]> = {
      fridge: [],
      freezer: [],
      pantry: [],
      spice_rack: [],
    };

    items.forEach((item) => {
      const location = itemLocations[item.id] || "pantry";
      groups[location].push(item);
    });

    return groups;
  }, [items, itemLocations]);

  // Count items per location
  const locationCounts = useMemo(() => {
    const counts: Record<StorageLocation, number> = {
      fridge: 0,
      freezer: 0,
      pantry: 0,
      spice_rack: 0,
    };

    Object.values(itemLocations).forEach((location) => {
      counts[location]++;
    });

    return counts;
  }, [itemLocations]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setLocationOverrides({});
    }
    onOpenChange(isOpen);
  };

  const handleItemLocationChange = (itemId: string, location: StorageLocation) => {
    setItemLocation(itemId, location);
  };

  const handleSetAllLocation = (location: StorageLocation) => {
    const newOverrides: Record<string, StorageLocation> = {};
    items.forEach((item) => {
      newOverrides[item.id] = location;
    });
    setLocationOverrides(newOverrides);
  };

  const handleSubmit = async () => {
    try {
      // Group items by location and make bulk calls per location
      const locationItemIds: Record<StorageLocation, string[]> = {
        fridge: [],
        freezer: [],
        pantry: [],
        spice_rack: [],
      };

      items.forEach((item) => {
        const location = itemLocations[item.id] || "pantry";
        locationItemIds[location].push(item.id);
      });

      // Execute moves for each location group
      const promises: Promise<unknown>[] = [];

      for (const [location, ids] of Object.entries(locationItemIds)) {
        if (ids.length === 0) continue;

        if (ids.length === 1) {
          promises.push(
            moveOne({
              groceryId: ids[0],
              data: { storage_location: location as StorageLocation },
            }).unwrap()
          );
        } else {
          promises.push(
            moveBulk({
              ids,
              storage_location: location as StorageLocation,
            }).unwrap()
          );
        }
      }

      await Promise.all(promises);

      toast.success(
        items.length === 1
          ? t("success")
          : t("bulkSuccess", { count: items.length })
      );
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
          {/* AI-detected notice */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>{t("autoDetected")}</span>
          </div>

          {/* Single item - simple select */}
          {!isBulk && items[0] && (
            <div className="space-y-3">
              <Label>{t("selectLocation")}</Label>
              <Select
                value={itemLocations[items[0].id] || "pantry"}
                onValueChange={(value) => handleItemLocationChange(items[0].id, value as StorageLocation)}
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
            </div>
          )}

          {/* Bulk items - show per-item locations */}
          {isBulk && (
            <div className="space-y-3">
              {/* Quick set all buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">{t("setAllTo")}:</span>
                {STORAGE_LOCATIONS.map((location) => (
                  <Button
                    key={location.value}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleSetAllLocation(location.value)}
                  >
                    {tPantry(`storageLocations.${location.value}`)}
                  </Button>
                ))}
              </div>

              {/* Location summary badges */}
              <div className="flex flex-wrap gap-2">
                {STORAGE_LOCATIONS.filter((loc) => locationCounts[loc.value] > 0).map((location) => (
                  <Badge
                    key={location.value}
                    className={locationStyles[location.value]}
                  >
                    {tPantry(`storageLocations.${location.value}`)}: {locationCounts[location.value]}
                  </Badge>
                ))}
              </div>

              {/* Items list with per-item location select */}
              <div className="rounded-md border max-h-[250px] overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0"
                  >
                    <span className="text-sm truncate flex-1" title={item.name}>
                      {item.name}
                    </span>
                    <Select
                      value={itemLocations[item.id] || "pantry"}
                      onValueChange={(value) => handleItemLocationChange(item.id, value as StorageLocation)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STORAGE_LOCATIONS.map((location) => (
                          <SelectItem key={location.value} value={location.value}>
                            {tPantry(`storageLocations.${location.value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

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
