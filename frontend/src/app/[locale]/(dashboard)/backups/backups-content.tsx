"use client";

import { useState } from "react";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
  Database,
  RefreshCcw,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import {
  useCreateBackupMutation,
  useGetBackupsQuery,
  useRestoreBackupMutation,
  useDeleteBackupMutation,
  type ModuleType,
} from "@/lib/api/backups-api";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface RestoreBackupState {
  id: string;
  moduleType: ModuleType;
}

export function BackupsContent() {
  const t = useTranslations("backups");

  const MODULE_OPTIONS: { value: ModuleType; label: string }[] = [
    { value: "groceries", label: t("modules.groceries") },
    { value: "pantry", label: t("modules.pantry") },
    { value: "shopping_lists", label: t("modules.shopping_lists") },
    { value: "recipes", label: t("modules.recipes") },
    { value: "meal_plans", label: t("modules.meal_plans") },
    { value: "kitchen_equipment", label: t("modules.kitchen_equipment") },
    { value: "restaurants", label: t("modules.restaurants") },
    { value: "restaurant_meals", label: t("modules.restaurant_meals") },
    { value: "nutrition_logs", label: t("modules.nutrition_logs") },
    { value: "nutrition_goals", label: t("modules.nutrition_goals") },
    { value: "health_metrics", label: t("modules.health_metrics") },
    { value: "user_skills", label: t("modules.user_skills") },
    { value: "cooking_history", label: t("modules.cooking_history") },
    { value: "recipe_collections", label: t("modules.recipe_collections") },
  ];

  const getErrorMessage = (
    error: FetchBaseQueryError | SerializedError
  ): string => {
    if ("status" in error) {
      if (
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null
      ) {
        const data = error.data as { detail?: string };
        return data.detail || t("messages.errorGeneric");
      }
      return t("messages.errorGeneric");
    }
    return error.message || t("messages.errorGeneric");
  };

  const [selectedModule, setSelectedModule] = useState<ModuleType>("groceries");
  const [restoreBackup, setRestoreBackup] = useState<RestoreBackupState | null>(
    null
  );
  const [deleteBackupId, setDeleteBackupId] = useState<string | null>(null);

  const { data: backups, isLoading: backupsLoading } = useGetBackupsQuery();
  const [createBackup, { isLoading: creating }] = useCreateBackupMutation();
  const [restoreBackupMutation, { isLoading: restoring }] =
    useRestoreBackupMutation();
  const [deleteBackup, { isLoading: deleting }] = useDeleteBackupMutation();

  const handleCreateBackup = async () => {
    try {
      const result = await createBackup({
        module_type: selectedModule,
      }).unwrap();

      toast.success(t("messages.createSuccess"), {
        description: t("messages.createSuccessDescription", {
          count: result.item_count,
          module: getModuleLabel(selectedModule),
        }),
      });
    } catch (error) {
      toast.error(t("messages.createError"), {
        description: getErrorMessage(
          error as FetchBaseQueryError | SerializedError
        ),
      });
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreBackup) return;

    try {
      const result = await restoreBackupMutation({
        backupId: restoreBackup.id,
        moduleType: restoreBackup.moduleType,
      }).unwrap();

      toast.success(t("messages.restoreSuccess"), {
        description: t("messages.restoreSuccessDescription", {
          count: result.restored_count,
        }),
      });

      setRestoreBackup(null);
    } catch (error) {
      toast.error(t("messages.restoreError"), {
        description: getErrorMessage(
          error as FetchBaseQueryError | SerializedError
        ),
      });
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteBackupId) return;

    try {
      await deleteBackup(deleteBackupId).unwrap();

      toast.success(t("messages.deleteSuccess"));
      setDeleteBackupId(null);
    } catch (error) {
      toast.error(t("messages.deleteError"), {
        description: getErrorMessage(
          error as FetchBaseQueryError | SerializedError
        ),
      });
    }
  };

  const getModuleLabel = (moduleType: ModuleType): string => {
    return (
      MODULE_OPTIONS.find((m) => m.value === moduleType)?.label || moduleType
    );
  };

  return (
    <div className="space-y-6">
      {/* Create Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("create.title")}
          </CardTitle>
          <CardDescription>{t("create.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            {/* Module Selector */}
            <div className="space-y-2">
              <Label htmlFor="module">{t("create.label")}</Label>
              <Select
                value={selectedModule}
                onValueChange={(value) =>
                  setSelectedModule(value as ModuleType)
                }
              >
                <SelectTrigger id="module">
                  <SelectValue placeholder={t("create.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((module) => (
                    <SelectItem key={module.value} value={module.value}>
                      {module.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Create Button */}
            <div className="flex items-end">
              <Button
                onClick={handleCreateBackup}
                disabled={creating}
                className="w-full gap-2"
              >
                <Database className="h-4 w-4" />
                {creating ? t("create.creating") : t("create.button")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t("list.title")}
          </CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {backupsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("list.loading")}
            </div>
          ) : !backups || backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("list.empty")}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("list.table.date")}</TableHead>
                    <TableHead>{t("list.table.module")}</TableHead>
                    <TableHead>{t("list.table.items")}</TableHead>
                    <TableHead className="text-right">
                      {t("list.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">
                        {format(new Date(backup.created_at), "PPpp")}
                      </TableCell>
                      <TableCell>
                        {getModuleLabel(backup.module_type)}
                      </TableCell>
                      <TableCell>
                        {t("list.itemCount", { count: backup.item_count })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRestoreBackup({
                                id: backup.id,
                                moduleType: backup.module_type,
                              })
                            }
                            disabled={restoring}
                            className="gap-1"
                          >
                            <RefreshCcw className="h-3 w-3" />
                            {t("list.actions.restore")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteBackupId(backup.id)}
                            disabled={deleting}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("list.actions.delete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t("info.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• {t("info.point1")}</p>
          <p>
            • <strong>{t("info.warning")}</strong> {t("info.point2")}
          </p>
          <p>• {t("info.point3")}</p>
          <p>• {t("info.point4")}</p>
          <p>• {t("info.point5")}</p>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!restoreBackup}
        onOpenChange={() => setRestoreBackup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.restore.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.restore.description", {
                module: restoreBackup
                  ? getModuleLabel(restoreBackup.moduleType)
                  : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialogs.restore.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreBackup} disabled={restoring}>
              {restoring
                ? t("dialogs.restore.restoring")
                : t("dialogs.restore.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteBackupId}
        onOpenChange={() => setDeleteBackupId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialogs.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBackup}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting
                ? t("dialogs.delete.deleting")
                : t("dialogs.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
