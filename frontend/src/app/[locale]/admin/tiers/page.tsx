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
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown, Edit, Settings, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  useGetAdminTiersQuery,
  useUpdateTierMutation,
  useGetTierFeaturesQuery,
  useGetAllFeaturesQuery,
  useGetFeaturesComparisonQuery,
  useAssignFeatureToTierMutation,
  type AdminTier,
  type TierFeature,
} from "@/lib/api/admin-api";

export default function AdminTiersPage() {
  const t = useTranslations("admin");

  // State
  const [editTier, setEditTier] = useState<AdminTier | null>(null);
  const [manageFeaturesFor, setManageFeaturesFor] = useState<AdminTier | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPriceMonthly, setEditPriceMonthly] = useState("");

  // API
  const { data: tiers, isLoading: tiersLoading } = useGetAdminTiersQuery();
  const { data: allFeatures } = useGetAllFeaturesQuery();
  const { data: featuresComparison } = useGetFeaturesComparisonQuery();
  const { data: tierFeatures, isLoading: featuresLoading } = useGetTierFeaturesQuery(
    manageFeaturesFor?.id || "",
    { skip: !manageFeaturesFor }
  );
  const [updateTier, { isLoading: updating }] = useUpdateTierMutation();
  const [assignFeature, { isLoading: assigning }] = useAssignFeatureToTierMutation();

  // Handlers
  const handleEditOpen = (tier: AdminTier) => {
    setEditTier(tier);
    setEditDisplayName(tier.display_name);
    setEditPriceMonthly(tier.price_monthly?.toString() || "");
  };

  const handleEditSave = async () => {
    if (!editTier) return;

    try {
      await updateTier({
        tierId: editTier.id,
        data: {
          display_name: editDisplayName,
          price_monthly: editPriceMonthly ? parseFloat(editPriceMonthly) : undefined,
        },
      }).unwrap();
      toast.success(t("tiers.messages.updateSuccess"));
      setEditTier(null);
    } catch {
      toast.error(t("tiers.messages.updateError"));
    }
  };

  const handleFeatureToggle = async (feature: TierFeature) => {
    if (!manageFeaturesFor) return;

    try {
      await assignFeature({
        tierId: manageFeaturesFor.id,
        data: {
          feature_id: feature.feature_id,
          enabled: !feature.enabled,
          limit_value: feature.limit_value,
        },
      }).unwrap();
      toast.success(t("tiers.messages.featureUpdated"));
    } catch {
      toast.error(t("tiers.messages.featureError"));
    }
  };

  const getTierIcon = (name: string) => {
    if (name.toLowerCase() === "pro") {
      return <Crown className="h-6 w-6 text-yellow-500" />;
    }
    return null;
  };

  const isFeatureEnabled = (featureId: string) => {
    return tierFeatures?.find((f) => f.feature_id === featureId)?.enabled ?? false;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tiers.title")}
        description={t("tiers.description")}
      />

      {/* Tiers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tiersLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))
        ) : (
          tiers?.map((tier) => (
            <Card key={tier.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getTierIcon(tier.name)}
                    {tier.display_name}
                  </CardTitle>
                  <Badge variant="outline">{tier.name}</Badge>
                </div>
                <CardDescription>
                  {t("tiers.card.priceLabel")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${tier.price_monthly?.toFixed(2) ?? "0.00"}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{t("tiers.card.month")}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEditOpen(tier)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t("tiers.card.edit")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setManageFeaturesFor(tier)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t("tiers.card.features")}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Features Comparison Table */}
      {allFeatures && allFeatures.length > 0 && tiers && tiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("tiers.comparison.title")}</CardTitle>
            <CardDescription>{t("tiers.comparison.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{t("tiers.comparison.feature")}</TableHead>
                    {tiers.map((tier) => (
                      <TableHead key={tier.id} className="text-center">
                        {tier.display_name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFeatures.map((feature) => (
                    <TableRow key={feature.id}>
                      <TableCell className="font-medium">{feature.name}</TableCell>
                      {tiers.map((tier) => {
                        const tierFeatureData = featuresComparison?.[tier.id]?.[feature.id];
                        const isEnabled = tierFeatureData?.enabled ?? false;
                        const limitValue = tierFeatureData?.limit_value;

                        return (
                          <TableCell key={tier.id} className="text-center">
                            {isEnabled ? (
                              <div className="flex flex-col items-center gap-1">
                                <Check className="h-5 w-5 text-green-500" />
                                {limitValue !== null && limitValue !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    {limitValue === -1 ? t("tiers.comparison.unlimited") : `${t("tiers.comparison.limit")}: ${limitValue}`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Tier Dialog */}
      <Dialog open={!!editTier} onOpenChange={() => setEditTier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tiers.edit.title")}</DialogTitle>
            <DialogDescription>
              {t("tiers.edit.description", { name: editTier?.name || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("tiers.edit.displayName")}</Label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("tiers.edit.priceMonthly")}</Label>
              <Input
                type="number"
                step="0.01"
                value={editPriceMonthly}
                onChange={(e) => setEditPriceMonthly(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTier(null)}>
              {t("tiers.edit.cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={updating}>
              {updating ? t("tiers.edit.saving") : t("tiers.edit.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Features Dialog */}
      <Dialog open={!!manageFeaturesFor} onOpenChange={() => setManageFeaturesFor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("tiers.features.title")}</DialogTitle>
            <DialogDescription>
              {t("tiers.features.description", { name: manageFeaturesFor?.display_name || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 overflow-y-auto flex-1">
            {featuresLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : tierFeatures && tierFeatures.length > 0 ? (
              <div className="space-y-3">
                {tierFeatures.map((feature) => (
                  <div
                    key={feature.feature_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{feature.feature_name}</p>
                      <p className="text-xs text-muted-foreground">{feature.feature_key}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {feature.limit_value && (
                        <span className="text-xs text-muted-foreground">
                          {t("tiers.features.limit")}: {feature.limit_value}
                        </span>
                      )}
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={() => handleFeatureToggle(feature)}
                        disabled={assigning}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : allFeatures && allFeatures.length > 0 ? (
              <div className="space-y-3">
                {allFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground">{feature.key}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isFeatureEnabled(feature.id) ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t("tiers.features.empty")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setManageFeaturesFor(null)}>
              {t("tiers.features.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
