"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGetAdminCurrenciesQuery,
  useCreateCurrencyMutation,
  useUpdateCurrencyMutation,
  useDeleteCurrencyMutation,
  type AdminCurrency,
} from "@/lib/api/admin-api";

export default function AdminCurrenciesPage() {
  const t = useTranslations("admin");

  // State
  const [selectedCurrency, setSelectedCurrency] = useState<AdminCurrency | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimalPlaces, setDecimalPlaces] = useState(2);
  const [symbolPosition, setSymbolPosition] = useState<"before" | "after">("before");
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [isActive, setIsActive] = useState(true);

  // API
  const { data: currencies, isLoading } = useGetAdminCurrenciesQuery({ active_only: false });
  const [createCurrency, { isLoading: isCreating }] = useCreateCurrencyMutation();
  const [updateCurrency, { isLoading: isUpdating }] = useUpdateCurrencyMutation();
  const [deleteCurrency, { isLoading: isDeleting }] = useDeleteCurrencyMutation();

  // Handlers
  const handleAddCurrency = () => {
    setCode("");
    setName("");
    setSymbol("");
    setDecimalPlaces(2);
    setSymbolPosition("before");
    setExchangeRate("1.0");
    setIsActive(true);
    setAddDialogOpen(true);
  };

  const handleEditCurrency = (currency: AdminCurrency) => {
    setSelectedCurrency(currency);
    setCode(currency.code);
    setName(currency.name);
    setSymbol(currency.symbol);
    setDecimalPlaces(currency.decimal_places);
    setSymbolPosition(currency.symbol_position as "before" | "after");
    setExchangeRate(currency.exchange_rate.toString());
    setIsActive(currency.is_active);
    setEditDialogOpen(true);
  };

  const handleDeleteCurrency = (currency: AdminCurrency) => {
    setSelectedCurrency(currency);
    setDeleteDialogOpen(true);
  };

  const handleCreateCurrency = async () => {
    try {
      await createCurrency({
        code: code.toUpperCase(),
        name,
        symbol,
        decimal_places: decimalPlaces,
        symbol_position: symbolPosition,
        exchange_rate: parseFloat(exchangeRate),
        is_active: isActive,
      }).unwrap();

      toast.success(t("currencies.messages.createSuccess"));
      setAddDialogOpen(false);
    } catch {
      toast.error(t("currencies.messages.createError"));
    }
  };

  const handleUpdateCurrency = async () => {
    if (!selectedCurrency) return;

    try {
      await updateCurrency({
        currencyId: selectedCurrency.id,
        data: {
          name,
          symbol,
          decimal_places: decimalPlaces,
          symbol_position: symbolPosition,
          exchange_rate: parseFloat(exchangeRate),
          is_active: isActive,
        },
      }).unwrap();

      toast.success(t("currencies.messages.updateSuccess"));
      setEditDialogOpen(false);
    } catch {
      toast.error(t("currencies.messages.updateError"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCurrency) return;

    try {
      await deleteCurrency(selectedCurrency.id).unwrap();
      toast.success(t("currencies.messages.deleteSuccess"));
      setDeleteDialogOpen(false);
    } catch {
      toast.error(t("currencies.messages.deleteError"));
    }
  };

  const formatExample = (currency: AdminCurrency) => {
    const amount = "1,234.56";
    if (currency.symbol_position === "before") {
      return `${currency.symbol}${amount}`;
    }
    return `${amount} ${currency.symbol}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("currencies.title")}
          description={t("currencies.description")}
        />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("currencies.title")}
        description={t("currencies.description")}
      />

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            {t("currencies.actions.title")}
          </CardTitle>
          <CardDescription>
            {t("currencies.actions.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAddCurrency}>
            <Plus className="mr-2 h-4 w-4" />
            {t("currencies.actions.add")}
          </Button>
        </CardContent>
      </Card>

      {/* Currencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("currencies.table.title")}</CardTitle>
          <CardDescription>
            {t("currencies.table.description", { count: currencies?.length || 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("currencies.table.code")}</TableHead>
                  <TableHead>{t("currencies.table.name")}</TableHead>
                  <TableHead>{t("currencies.table.symbol")}</TableHead>
                  <TableHead>{t("currencies.table.example")}</TableHead>
                  <TableHead>{t("currencies.table.exchangeRate")}</TableHead>
                  <TableHead>{t("currencies.table.status")}</TableHead>
                  <TableHead className="text-right">{t("currencies.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies?.map((currency) => (
                  <TableRow key={currency.id}>
                    <TableCell className="font-medium">{currency.code}</TableCell>
                    <TableCell>{currency.name}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-lg">{currency.symbol}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatExample(currency)}
                    </TableCell>
                    <TableCell>{currency.exchange_rate}</TableCell>
                    <TableCell>
                      {currency.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("currencies.status.active")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          {t("currencies.status.inactive")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCurrency(currency)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCurrency(currency)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!currencies || currencies.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("currencies.table.empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Currency Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("currencies.add.title")}</DialogTitle>
            <DialogDescription>
              {t("currencies.add.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t("currencies.form.code")}</Label>
              <Input
                id="code"
                placeholder="USD"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={3}
              />
              <p className="text-xs text-muted-foreground">
                {t("currencies.form.codeHint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("currencies.form.name")}</Label>
              <Input
                id="name"
                placeholder="US Dollar"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">{t("currencies.form.symbol")}</Label>
                <Input
                  id="symbol"
                  placeholder="$"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">{t("currencies.form.position")}</Label>
                <Select
                  value={symbolPosition}
                  onValueChange={(v) => setSymbolPosition(v as "before" | "after")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">{t("currencies.form.positionBefore")}</SelectItem>
                    <SelectItem value="after">{t("currencies.form.positionAfter")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="decimal">{t("currencies.form.decimals")}</Label>
                <Input
                  id="decimal"
                  type="number"
                  min="0"
                  max="8"
                  value={decimalPlaces}
                  onChange={(e) => setDecimalPlaces(parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">{t("currencies.form.exchangeRate")}</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">{t("currencies.form.active")}</Label>
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t("currencies.form.cancel")}
            </Button>
            <Button
              onClick={handleCreateCurrency}
              disabled={isCreating || !code || !name || !symbol}
            >
              {isCreating ? t("currencies.form.creating") : t("currencies.form.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Currency Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("currencies.edit.title")}</DialogTitle>
            <DialogDescription>
              {t("currencies.edit.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("currencies.form.code")}</Label>
              <Input value={code} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("currencies.form.name")}</Label>
              <Input
                id="edit-name"
                placeholder="US Dollar"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-symbol">{t("currencies.form.symbol")}</Label>
                <Input
                  id="edit-symbol"
                  placeholder="$"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">{t("currencies.form.position")}</Label>
                <Select
                  value={symbolPosition}
                  onValueChange={(v) => setSymbolPosition(v as "before" | "after")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">{t("currencies.form.positionBefore")}</SelectItem>
                    <SelectItem value="after">{t("currencies.form.positionAfter")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-decimal">{t("currencies.form.decimals")}</Label>
                <Input
                  id="edit-decimal"
                  type="number"
                  min="0"
                  max="8"
                  value={decimalPlaces}
                  onChange={(e) => setDecimalPlaces(parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rate">{t("currencies.form.exchangeRate")}</Label>
                <Input
                  id="edit-rate"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">{t("currencies.form.active")}</Label>
              <Switch
                id="edit-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("currencies.form.cancel")}
            </Button>
            <Button onClick={handleUpdateCurrency} disabled={isUpdating || !name || !symbol}>
              {isUpdating ? t("currencies.form.updating") : t("currencies.form.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("currencies.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("currencies.delete.description", {
                code: selectedCurrency?.code || "",
                name: selectedCurrency?.name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("currencies.form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("currencies.form.deleting") : t("currencies.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
