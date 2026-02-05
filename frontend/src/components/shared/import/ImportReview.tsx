"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Loader2,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useImportWizard, ParsedItem } from "./ImportWizard";

export interface ColumnDefinition<T extends ParsedItem> {
  key: keyof T;
  header: string; // Direct header text (already translated)
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[]; // Direct label text (already translated)
  width?: string;
  editable?: boolean;
  required?: boolean;
  renderCell?: (value: unknown, item: T) => React.ReactNode; // Custom cell renderer for display mode
}

export interface QuickFilter {
  id: string;
  label: string;
  /** Keywords to match against item name (case-insensitive) */
  keywords: string[];
}

interface ImportReviewProps<T extends ParsedItem> {
  columns: ColumnDefinition<T>[];
  onSave: (items: T[]) => Promise<void>;
  itemNameKey?: keyof T;
  translationNamespace?: string;
  emptyMessage?: string;
  saveButtonTextKey?: string;
  descriptionKey?: string;
  /** Quick filter buttons to remove items matching keywords */
  quickFilters?: QuickFilter[];
}

export function ImportReview<T extends ParsedItem>({
  columns,
  onSave,
  itemNameKey = "name" as keyof T,
  translationNamespace = "import",
  emptyMessage,
  saveButtonTextKey,
  descriptionKey = "review.description",
  quickFilters,
}: ImportReviewProps<T>) {
  const t = useTranslations(translationNamespace);
  const tCommon = useTranslations("common");
  const { parsedItems, setParsedItems, setStep, isProcessing, setIsProcessing } =
    useImportWizard<T>();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedItem, setEditedItem] = useState<T | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleEdit = (item: T) => {
    setEditingId(item.id);
    setEditedItem({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedItem(null);
  };

  const handleSaveEdit = () => {
    if (!editedItem) return;

    setParsedItems(
      parsedItems.map((item) => (item.id === editedItem.id ? editedItem : item))
    );
    setEditingId(null);
    setEditedItem(null);
  };

  const handleDelete = (id: string) => {
    setParsedItems(parsedItems.filter((item) => item.id !== id));
    selectedIds.delete(id);
    setSelectedIds(new Set(selectedIds));
  };

  const handleDeleteSelected = () => {
    setParsedItems(parsedItems.filter((item) => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(parsedItems.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleFieldChange = (key: keyof T, value: unknown) => {
    if (!editedItem) return;
    setEditedItem({ ...editedItem, [key]: value });
  };

  const handleQuickFilter = useCallback(
    (filter: QuickFilter) => {
      const filtered = parsedItems.filter((item) => {
        const itemName = String(item[itemNameKey] || "").toLowerCase();
        return !filter.keywords.some((keyword) =>
          itemName.includes(keyword.toLowerCase())
        );
      });
      setParsedItems(filtered);
      // Clear selections for removed items
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        parsedItems.forEach((item) => {
          if (!filtered.find((f) => f.id === item.id)) {
            newSet.delete(item.id);
          }
        });
        return newSet;
      });
    },
    [parsedItems, setParsedItems, itemNameKey]
  );

  // Count items that would be removed by each filter
  const getFilterMatchCount = useCallback(
    (filter: QuickFilter) => {
      return parsedItems.filter((item) => {
        const itemName = String(item[itemNameKey] || "").toLowerCase();
        return filter.keywords.some((keyword) =>
          itemName.includes(keyword.toLowerCase())
        );
      }).length;
    },
    [parsedItems, itemNameKey]
  );

  const handleSaveAll = async () => {
    if (parsedItems.length === 0) return;

    setIsProcessing(true);
    setSaveError(null);

    try {
      await onSave(parsedItems);
      setStep("complete");
    } catch (error) {
      console.error("Failed to save items:", error);
      setSaveError(t("review.saveError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCell = (item: T, column: ColumnDefinition<T>, isEditing: boolean) => {
    const value = isEditing ? editedItem?.[column.key] : item[column.key];

    if (!isEditing || column.editable === false) {
      // Use custom renderer if provided
      if (column.renderCell) {
        return column.renderCell(value, item);
      }
      if (column.type === "select" && column.options) {
        const option = column.options.find((opt) => opt.value === value);
        return option ? option.label : String(value || "");
      }
      return String(value ?? "");
    }

    switch (column.type) {
      case "select":
        return (
          <Select
            value={String(value || "")}
            onValueChange={(v) => handleFieldChange(column.key, v)}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "number":
        return (
          <Input
            type="number"
            value={String(value ?? "")}
            onChange={(e) =>
              handleFieldChange(column.key, parseFloat(e.target.value) || 0)
            }
            className="h-8 w-full"
            min={0}
            step="any"
          />
        );

      default:
        return (
          <Input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => handleFieldChange(column.key, e.target.value)}
            className="h-8 w-full"
          />
        );
    }
  };

  const allSelected = parsedItems.length > 0 && selectedIds.size === parsedItems.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < parsedItems.length;

  if (parsedItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{emptyMessage || t("review.noItems")}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setStep("input")}
            >
              {t("review.goBack")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t("review.title")}</span>
          <Badge variant="secondary">
            {t("review.itemCount", { count: parsedItems.length })}
          </Badge>
        </CardTitle>
        <CardDescription>{t(descriptionKey)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick filters to remove non-relevant items */}
        {quickFilters && quickFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("review.quickRemove")}:</span>
            {quickFilters.map((filter) => {
              const matchCount = getFilterMatchCount(filter);
              if (matchCount === 0) return null;
              return (
                <Button
                  key={filter.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickFilter(filter)}
                  className="h-7 text-xs gap-1"
                >
                  <X className="h-3 w-3" />
                  {filter.label}
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {matchCount}
                  </Badge>
                </Button>
              );
            })}
          </div>
        )}

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">
              {t("review.selectedCount", { count: selectedIds.size })}
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("review.deleteSelected")}
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label={t("review.selectAll")}
                    {...(someSelected ? { "data-state": "indeterminate" } : {})}
                  />
                </TableHead>
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    style={{ width: column.width }}
                  >
                    {column.header}
                  </TableHead>
                ))}
                <TableHead className="w-24 text-right">
                  {tCommon("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedItems.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      selectedIds.has(item.id) && "bg-muted/50"
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) =>
                          handleSelectItem(item.id, checked as boolean)
                        }
                        aria-label={t("review.selectItem")}
                      />
                    </TableCell>
                    {columns.map((column) => (
                      <TableCell key={String(column.key)}>
                        {renderCell(item, column, isEditing)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleSaveEdit}
                              className="h-8 w-8"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Error message */}
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {saveError}
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSaveAll}
            disabled={isProcessing || parsedItems.length === 0}
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("review.saving")}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {saveButtonTextKey
                  ? t(saveButtonTextKey, { count: parsedItems.length })
                  : t("review.addToGroceries", { count: parsedItems.length })}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
