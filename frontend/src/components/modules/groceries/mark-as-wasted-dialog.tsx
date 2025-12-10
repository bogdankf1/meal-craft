"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useMarkAsWastedMutation,
  useBulkMarkAsWastedMutation,
  type WasteReason,
  WASTE_REASONS,
} from "@/lib/api/groceries-api";

interface MarkAsWastedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function MarkAsWastedDialog({
  open,
  onOpenChange,
  items,
  onSuccess,
}: MarkAsWastedDialogProps) {
  const t = useTranslations("groceries.waste");
  const tCommon = useTranslations("common");

  const [wasteReason, setWasteReason] = useState<WasteReason>("expired");
  const [wasteNotes, setWasteNotes] = useState("");

  const [markAsWasted, { isLoading: isMarkingOne }] = useMarkAsWastedMutation();
  const [bulkMarkAsWasted, { isLoading: isMarkingBulk }] = useBulkMarkAsWastedMutation();

  const isLoading = isMarkingOne || isMarkingBulk;
  const isBulk = items.length > 1;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // Reset state when dialog opens
      setWasteReason("expired");
      setWasteNotes("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    try {
      if (isBulk) {
        await bulkMarkAsWasted({
          ids: items.map((item) => item.id),
          waste_reason: wasteReason,
          waste_notes: wasteNotes || undefined,
        }).unwrap();
        toast.success(t("bulkSuccess", { count: items.length }));
      } else {
        await markAsWasted({
          id: items[0].id,
          data: {
            waste_reason: wasteReason,
            waste_notes: wasteNotes || undefined,
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
            <Trash2 className="h-5 w-5 text-destructive" />
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
              <p className="text-sm font-medium mb-2">{t("itemsToMark")}:</p>
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

          {/* Waste reason selection */}
          <div className="space-y-3">
            <Label>{t("selectReason")}</Label>
            <RadioGroup
              value={wasteReason}
              onValueChange={(value) => setWasteReason(value as WasteReason)}
            >
              <div className="grid grid-cols-1 gap-2">
                {WASTE_REASONS.map((reason) => (
                  <div
                    key={reason.value}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted"
                  >
                    <RadioGroupItem value={reason.value} id={reason.value} />
                    <Label
                      htmlFor={reason.value}
                      className="flex-1 cursor-pointer"
                    >
                      {t(`reasons.${reason.value}`)}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="waste-notes">{t("notes")}</Label>
            <Textarea
              id="waste-notes"
              placeholder={t("notesPlaceholder")}
              value={wasteNotes}
              onChange={(e) => setWasteNotes(e.target.value)}
              rows={2}
            />
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
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? t("marking") : t("markAsWasted")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
