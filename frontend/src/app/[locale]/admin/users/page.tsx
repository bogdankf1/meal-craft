"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Edit, UserX, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useGetUsersQuery,
  useUpdateUserMutation,
  useSuspendUserMutation,
  useUnsuspendUserMutation,
  type AdminUser,
  type UserRole,
  type SubscriptionTier,
} from "@/lib/api/admin-api";

export default function AdminUsersPage() {
  const t = useTranslations("admin");

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [tierFilter, setTierFilter] = useState<SubscriptionTier | "all">("all");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [suspendUser, setSuspendUser] = useState<AdminUser | null>(null);

  // Form state for edit dialog
  const [editRole, setEditRole] = useState<UserRole>("USER");
  const [editTier, setEditTier] = useState<SubscriptionTier>("FREE");

  // API
  const { data, isLoading, isFetching } = useGetUsersQuery({
    page,
    page_size: 20,
    search: search || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    tier: tierFilter !== "all" ? tierFilter : undefined,
  });
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [suspendUserMutation, { isLoading: suspending }] = useSuspendUserMutation();
  const [unsuspendUserMutation, { isLoading: unsuspending }] = useUnsuspendUserMutation();

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // Handlers
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleEditOpen = (user: AdminUser) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditTier(user.subscription_tier);
  };

  const handleEditSave = async () => {
    if (!editUser) return;

    try {
      await updateUser({
        userId: editUser.id,
        data: {
          role: editRole,
          subscription_tier: editTier,
        },
      }).unwrap();
      toast.success(t("users.messages.updateSuccess"));
      setEditUser(null);
    } catch {
      toast.error(t("users.messages.updateError"));
    }
  };

  const handleSuspend = async () => {
    if (!suspendUser) return;

    try {
      if (suspendUser.is_active) {
        await suspendUserMutation({ userId: suspendUser.id }).unwrap();
        toast.success(t("users.messages.suspendSuccess"));
      } else {
        await unsuspendUserMutation(suspendUser.id).unwrap();
        toast.success(t("users.messages.unsuspendSuccess"));
      }
      setSuspendUser(null);
    } catch {
      toast.error(t("users.messages.suspendError"));
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    return role === "ADMIN" ? "default" : "secondary";
  };

  const getTierBadgeVariant = (tier: SubscriptionTier) => {
    switch (tier) {
      case "PRO":
        return "default";
      case "PLUS":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("users.list.title")}</CardTitle>
          <CardDescription>{t("users.list.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("users.filters.searchPlaceholder")}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v as UserRole | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("users.filters.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.filters.allRoles")}</SelectItem>
                <SelectItem value="USER">{t("users.roles.user")}</SelectItem>
                <SelectItem value="ADMIN">{t("users.roles.admin")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={tierFilter}
              onValueChange={(v) => {
                setTierFilter(v as SubscriptionTier | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("users.filters.tier")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("users.filters.allTiers")}</SelectItem>
                <SelectItem value="FREE">{t("users.tiers.free")}</SelectItem>
                <SelectItem value="PLUS">{t("users.tiers.plus")}</SelectItem>
                <SelectItem value="PRO">{t("users.tiers.pro")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.table.email")}</TableHead>
                  <TableHead>{t("users.table.name")}</TableHead>
                  <TableHead>{t("users.table.role")}</TableHead>
                  <TableHead>{t("users.table.tier")}</TableHead>
                  <TableHead>{t("users.table.status")}</TableHead>
                  <TableHead>{t("users.table.joined")}</TableHead>
                  <TableHead className="text-right">{t("users.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isFetching ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("users.list.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {t(`users.roles.${user.role.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTierBadgeVariant(user.subscription_tier)}>
                          {t(`users.tiers.${user.subscription_tier.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "default" : "destructive"}>
                          {user.is_active ? t("users.status.active") : t("users.status.suspended")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditOpen(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSuspendUser(user)}
                            className={user.is_active ? "text-destructive" : "text-green-600"}
                          >
                            {user.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("users.pagination.showing", {
                  from: (page - 1) * 20 + 1,
                  to: Math.min(page * 20, total),
                  total,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.edit.title")}</DialogTitle>
            <DialogDescription>
              {t("users.edit.description", { email: editUser?.email || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("users.edit.role")}</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">{t("users.roles.user")}</SelectItem>
                  <SelectItem value="ADMIN">{t("users.roles.admin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("users.edit.tier")}</Label>
              <Select value={editTier} onValueChange={(v) => setEditTier(v as SubscriptionTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">{t("users.tiers.free")}</SelectItem>
                  <SelectItem value="PLUS">{t("users.tiers.plus")}</SelectItem>
                  <SelectItem value="PRO">{t("users.tiers.pro")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              {t("users.edit.cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={updating}>
              {updating ? t("users.edit.saving") : t("users.edit.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend/Unsuspend Confirmation */}
      <AlertDialog open={!!suspendUser} onOpenChange={() => setSuspendUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendUser?.is_active
                ? t("users.suspend.title")
                : t("users.unsuspend.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendUser?.is_active
                ? t("users.suspend.description", { email: suspendUser?.email || "" })
                : t("users.unsuspend.description", { email: suspendUser?.email || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("users.suspend.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={suspending || unsuspending}
              className={suspendUser?.is_active ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {suspending || unsuspending
                ? t("users.suspend.processing")
                : suspendUser?.is_active
                  ? t("users.suspend.confirm")
                  : t("users.unsuspend.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
