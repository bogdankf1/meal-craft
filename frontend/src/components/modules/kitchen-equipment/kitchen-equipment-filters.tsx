"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_LOCATIONS,
  type EquipmentCategory,
  type EquipmentCondition,
  type EquipmentLocation,
} from "@/lib/api/kitchen-equipment-api";

interface KitchenEquipmentFiltersProps {
  category: string;
  onCategoryChange: (value: string) => void;
  condition: string;
  onConditionChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  needsMaintenance: string;
  onNeedsMaintenanceChange: (value: string) => void;
}

export function KitchenEquipmentFilters({
  category,
  onCategoryChange,
  condition,
  onConditionChange,
  location,
  onLocationChange,
  needsMaintenance,
  onNeedsMaintenanceChange,
}: KitchenEquipmentFiltersProps) {
  const t = useTranslations("kitchenEquipment");

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
      {/* Category Filter */}
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t("filters.allCategories")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
          {EQUIPMENT_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {t(`categories.${cat.value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Condition Filter */}
      <Select value={condition} onValueChange={onConditionChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t("filters.allConditions")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allConditions")}</SelectItem>
          {EQUIPMENT_CONDITIONS.map((cond) => (
            <SelectItem key={cond.value} value={cond.value}>
              {t(`conditions.${cond.value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location Filter */}
      <Select value={location} onValueChange={onLocationChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t("filters.allLocations")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allLocations")}</SelectItem>
          {EQUIPMENT_LOCATIONS.map((loc) => (
            <SelectItem key={loc.value} value={loc.value}>
              {t(`locations.${loc.value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Needs Maintenance Filter */}
      <Select value={needsMaintenance} onValueChange={onNeedsMaintenanceChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t("filters.maintenanceStatus")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allItems")}</SelectItem>
          <SelectItem value="true">{t("filters.needsMaintenance")}</SelectItem>
          <SelectItem value="false">{t("filters.upToDate")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
