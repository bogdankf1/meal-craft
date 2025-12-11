"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useRecordMaintenanceMutation,
  useBulkRecordMaintenanceMutation,
} from "@/lib/api/kitchen-equipment-api";

const maintenanceSchema = z.object({
  maintenance_date: z.string().min(1, "Maintenance date is required"),
  maintenance_notes: z.string().max(500).nullable().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface RecordMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { id: string; name: string }[];
}

export function RecordMaintenanceDialog({
  open,
  onOpenChange,
  items,
}: RecordMaintenanceDialogProps) {
  const t = useTranslations("kitchenEquipment");
  const tCommon = useTranslations("common");

  const [recordMaintenance, { isLoading: isRecording }] = useRecordMaintenanceMutation();
  const [bulkRecordMaintenance, { isLoading: isBulkRecording }] = useBulkRecordMaintenanceMutation();

  const isLoading = isRecording || isBulkRecording;
  const isBulk = items.length > 1;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      maintenance_date: format(new Date(), "yyyy-MM-dd"),
      maintenance_notes: null,
    },
  });

  const onSubmit = async (data: MaintenanceFormData) => {
    try {
      if (isBulk) {
        await bulkRecordMaintenance({
          ids: items.map((item) => item.id),
          maintenance_date: data.maintenance_date,
          maintenance_notes: data.maintenance_notes,
        }).unwrap();
        toast.success(t("maintenance.recordedMultiple", { count: items.length }));
      } else {
        await recordMaintenance({
          id: items[0].id,
          data: {
            maintenance_date: data.maintenance_date,
            maintenance_notes: data.maintenance_notes,
          },
        }).unwrap();
        toast.success(t("maintenance.recorded"));
      }

      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(t("maintenance.errorRecording"));
      console.error("Error recording maintenance:", error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t("maintenance.recordTitle")}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? t("maintenance.recordDescriptionMultiple", { count: items.length })
              : t("maintenance.recordDescription", { name: items[0]?.name })}
          </DialogDescription>
        </DialogHeader>

        {isBulk && items.length <= 5 && (
          <div className="mb-4">
            <Label className="text-sm text-muted-foreground mb-2 block">
              {t("maintenance.selectedItems")}:
            </Label>
            <ul className="list-disc list-inside text-sm">
              {items.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maintenance_date">{t("maintenance.date")} *</Label>
            <Input
              id="maintenance_date"
              type="date"
              {...register("maintenance_date")}
            />
            {errors.maintenance_date && (
              <p className="text-sm text-destructive">
                {errors.maintenance_date.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance_notes">{t("maintenance.notes")}</Label>
            <Textarea
              id="maintenance_notes"
              placeholder={t("maintenance.notesPlaceholder")}
              rows={3}
              {...register("maintenance_notes")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("maintenance.recording") : t("maintenance.recordButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
