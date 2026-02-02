"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateShoppingListMutation,
  useUpdateShoppingListMutation,
  type ShoppingListSummary,
} from "@/lib/api/shopping-lists-api";

const shoppingListSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  estimated_cost: z.number().min(0).nullable().optional(),
});

type ShoppingListFormData = z.infer<typeof shoppingListSchema>;

interface ShoppingListFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingList?: ShoppingListSummary | null;
  onSuccess?: () => void;
}

export function ShoppingListForm({
  open,
  onOpenChange,
  editingList,
  onSuccess,
}: ShoppingListFormProps) {
  const t = useTranslations("shoppingLists");
  const tCommon = useTranslations("common");

  const [createList, { isLoading: isCreating }] = useCreateShoppingListMutation();
  const [updateList, { isLoading: isUpdating }] = useUpdateShoppingListMutation();

  const isEditing = !!editingList;
  const isLoading = isCreating || isUpdating;

  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShoppingListFormData>({
    resolver: zodResolver(shoppingListSchema),
    defaultValues: {
      name: "",
      estimated_cost: null,
    },
  });

  const prevOpenRef = useRef(open);
  useEffect(() => {
    // Only reset when dialog opens (transition from closed to open)
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset local UI state when dialog opens
      setMoreOptionsOpen(false);
    }

    if (open) {
      if (editingList) {
        reset({
          name: editingList.name,
          estimated_cost: editingList.estimated_cost,
        });
      } else {
        reset({
          name: "",
          estimated_cost: null,
        });
      }
    }
  }, [open, editingList, reset]);

  const onSubmit = async (data: ShoppingListFormData) => {
    try {
      if (isEditing && editingList) {
        await updateList({
          id: editingList.id,
          data: {
            name: data.name,
            estimated_cost: data.estimated_cost,
          },
        }).unwrap();
        toast.success(t("messages.listUpdated"));
      } else {
        await createList({
          name: data.name,
          estimated_cost: data.estimated_cost,
        }).unwrap();
        toast.success(t("messages.listCreated"));
      }

      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(isEditing ? t("messages.errorUpdating") : t("messages.errorCreating"));
      console.error("Error saving shopping list:", error);
    }
  };

  const handleClose = () => {
    reset();
    setMoreOptionsOpen(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("form.editTitle") : t("form.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("form.name")}</Label>
            <Input
              id="name"
              placeholder={t("form.namePlaceholder")}
              autoFocus
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* More Options Toggle */}
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
          >
            {moreOptionsOpen ? (
              <>
                <ChevronUp className="h-3 w-3" />
                {t("form.fewerOptions")}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                {t("form.moreOptions")}
              </>
            )}
          </button>

          {moreOptionsOpen && (
            <div className="space-y-2">
              <Label htmlFor="estimated_cost">{t("form.estimatedCost")}</Label>
              <Input
                id="estimated_cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("estimated_cost", { valueAsNumber: true })}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("form.saving") : isEditing ? tCommon("save") : t("form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
