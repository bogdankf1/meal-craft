"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Cookies from "js-cookie";
import { useTheme } from "next-themes";
import {
  Settings,
  Palette,
  Globe,
  Bell,
  Leaf,
  DollarSign,
  Sun,
  Moon,
  Monitor,
  Users,
  Plus,
  Pencil,
  Trash2,
  Star,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Salad,
} from "lucide-react";

import {
  ModuleTabs,
  TabsContent,
} from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency-provider";
import { type CurrencyCode } from "@/lib/currency";

import {
  useGetUserSeasonalPreferencesQuery,
  useUpdateUserSeasonalPreferencesMutation,
  useGetSeasonalProduceQuery,
  SUPPORTED_COUNTRIES,
} from "@/lib/api/seasonality-api";
import {
  useGetProfilesQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useDeleteProfileMutation,
  type Profile,
} from "@/lib/api/profiles-api";
import { DietaryRestrictionsEditor } from "@/components/modules/settings/dietary-restrictions-editor";
import { NutritionalPreferencesEditor } from "@/components/modules/settings/nutritional-preferences-editor";

// Supported languages
const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
];

// Profile colors
const PROFILE_COLORS = [
  { value: "#3B82F6", name: "Blue" },
  { value: "#10B981", name: "Green" },
  { value: "#EC4899", name: "Pink" },
  { value: "#F59E0B", name: "Orange" },
  { value: "#8B5CF6", name: "Purple" },
  { value: "#EF4444", name: "Red" },
  { value: "#06B6D4", name: "Cyan" },
  { value: "#6B7280", name: "Gray" },
];

export function SettingsContent() {
  const t = useTranslations("settings");
  const tProfiles = useTranslations("profiles");
  const tSeasonality = useTranslations("seasonality");
  const tDietary = useTranslations("dietaryRestrictions");
  const tNutritional = useTranslations("nutritionalPreferences");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const currentLocale = useLocale();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  // Currency
  const { currency, currencies, setCurrency } = useCurrency();

  // Seasonality preferences
  const { data: seasonalPreferences, isLoading: isLoadingSeasonalPrefs } = useGetUserSeasonalPreferencesQuery();
  const [updateSeasonalPreferences] = useUpdateUserSeasonalPreferencesMutation();

  // Profiles
  const { data: profilesData, isLoading: isLoadingProfiles } = useGetProfilesQuery({});
  const [createProfile, { isLoading: isCreating }] = useCreateProfileMutation();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [deleteProfile, { isLoading: isDeleting }] = useDeleteProfileMutation();

  // Profile form state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileColor, setProfileColor] = useState("#3B82F6");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  // Get favorites count
  const selectedCountry = seasonalPreferences?.country_code || "UA";
  const { data: produceData } = useGetSeasonalProduceQuery({
    country_code: selectedCountry,
    per_page: 100,
  });
  const favoritesCount = produceData?.items.filter(p => p.is_favorite).length || 0;

  const tabs = [
    {
      value: "general",
      label: t("tabs.general"),
      icon: <Settings className="h-4 w-4" />,
    },
    {
      value: "household",
      label: t("tabs.household"),
      icon: <Users className="h-4 w-4" />,
    },
    {
      value: "appearance",
      label: t("tabs.appearance"),
      icon: <Palette className="h-4 w-4" />,
    },
    {
      value: "notifications",
      label: t("tabs.notifications"),
      icon: <Bell className="h-4 w-4" />,
    },
    {
      value: "seasonality",
      label: t("tabs.seasonality"),
      icon: <Leaf className="h-4 w-4" />,
    },
  ];

  const handleLanguageChange = (newLocale: string) => {
    Cookies.set("NEXT_LOCALE", newLocale, { expires: 365 });
    startTransition(() => {
      router.refresh();
    });
    toast.success(t("messages.languageChanged"));
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast.success(t("messages.themeChanged"));
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency as CurrencyCode);
    toast.success(t("messages.currencyChanged"));
  };

  const handleCountryChange = async (countryCode: string) => {
    try {
      await updateSeasonalPreferences({ country_code: countryCode }).unwrap();
      toast.success(tSeasonality("messages.countryUpdated"));
    } catch {
      toast.error(tSeasonality("messages.errorUpdatingPreferences"));
    }
  };

  const handleNotificationChange = async (enabled: boolean) => {
    try {
      await updateSeasonalPreferences({ notification_enabled: enabled }).unwrap();
      toast.success(t("messages.notificationsUpdated"));
    } catch {
      toast.error(t("messages.errorUpdatingNotifications"));
    }
  };

  const openCreateProfileDialog = () => {
    setEditingProfile(null);
    setProfileName("");
    setProfileColor("#3B82F6");
    setProfileDialogOpen(true);
  };

  const openEditProfileDialog = (profile: Profile) => {
    setEditingProfile(profile);
    setProfileName(profile.name);
    setProfileColor(profile.color || "#3B82F6");
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error(tProfiles("messages.nameRequired"));
      return;
    }

    try {
      if (editingProfile) {
        await updateProfile({
          id: editingProfile.id,
          data: { name: profileName, color: profileColor },
        }).unwrap();
        toast.success(tProfiles("messages.updated"));
      } else {
        await createProfile({ name: profileName, color: profileColor }).unwrap();
        toast.success(tProfiles("messages.created"));
      }
      setProfileDialogOpen(false);
    } catch {
      toast.error(editingProfile ? tProfiles("messages.updateError") : tProfiles("messages.createError"));
    }
  };

  const openDeleteDialog = (profile: Profile) => {
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;

    try {
      await deleteProfile(profileToDelete.id).unwrap();
      toast.success(tProfiles("messages.deleted"));
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
    } catch {
      toast.error(tProfiles("messages.deleteError"));
    }
  };

  const handleSetDefaultProfile = async (profile: Profile) => {
    try {
      await updateProfile({
        id: profile.id,
        data: { is_default: true },
      }).unwrap();
      toast.success(tProfiles("messages.setDefault"));
    } catch {
      toast.error(tProfiles("messages.updateError"));
    }
  };

  return (
    <>
    <ModuleTabs tabs={tabs} defaultTab="general">
      {/* General Tab */}
      <TabsContent value="general" className="space-y-6">
        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t("general.language.title")}
            </CardTitle>
            <CardDescription>{t("general.language.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={currentLocale} onValueChange={handleLanguageChange} disabled={isPending}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder={t("general.language.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Household Tab */}
      <TabsContent value="household" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("household.title")}
                </CardTitle>
                <CardDescription>{t("household.description")}</CardDescription>
              </div>
              <Button onClick={openCreateProfileDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t("household.addMember")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingProfiles ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : profilesData?.profiles && profilesData.profiles.length > 0 ? (
              <div className="space-y-3">
                {profilesData.profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Profile header */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: profile.color || "#3B82F6" }}
                        >
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{profile.name}</span>
                            {profile.is_default && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {t("household.default")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedProfileId(
                            expandedProfileId === profile.id ? null : profile.id
                          )}
                          title={tDietary("title")}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {expandedProfileId === profile.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        {!profile.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultProfile(profile)}
                            title={t("household.setDefault")}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditProfileDialog(profile)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(profile)}
                          disabled={profile.is_default && profilesData.profiles.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded dietary preferences section */}
                    {expandedProfileId === profile.id && (
                      <div className="border-t px-4 py-4 bg-muted/30 space-y-6">
                        {/* Dietary Restrictions */}
                        <div>
                          <div className="mb-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              {tDietary("title")}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {tDietary("description")}
                            </p>
                          </div>
                          <DietaryRestrictionsEditor profile={profile} />
                        </div>

                        {/* Nutritional Preferences */}
                        <div>
                          <div className="mb-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Salad className="h-4 w-4 text-green-500" />
                              {tNutritional("title")}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {tNutritional("description")}
                            </p>
                          </div>
                          <NutritionalPreferencesEditor profile={profile} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("household.empty")}</p>
                <Button className="mt-4" onClick={openCreateProfileDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("household.addFirst")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Appearance Tab */}
      <TabsContent value="appearance" className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t("appearance.theme.title")}
            </CardTitle>
            <CardDescription>{t("appearance.theme.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={theme}
              onValueChange={handleThemeChange}
              className="grid gap-4 md:grid-cols-3"
            >
              <Label
                htmlFor="theme-light"
                className={cn(
                  "flex flex-col items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all hover:border-primary",
                  theme === "light" && "border-primary bg-primary/5"
                )}
              >
                <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                <div className="p-3 rounded-full bg-amber-100">
                  <Sun className="h-6 w-6 text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{t("appearance.theme.light")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("appearance.theme.lightDescription")}
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="theme-dark"
                className={cn(
                  "flex flex-col items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all hover:border-primary",
                  theme === "dark" && "border-primary bg-primary/5"
                )}
              >
                <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                <div className="p-3 rounded-full bg-slate-800">
                  <Moon className="h-6 w-6 text-slate-200" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{t("appearance.theme.dark")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("appearance.theme.darkDescription")}
                  </p>
                </div>
              </Label>

              <Label
                htmlFor="theme-system"
                className={cn(
                  "flex flex-col items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all hover:border-primary",
                  theme === "system" && "border-primary bg-primary/5"
                )}
              >
                <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                <div className="p-3 rounded-full bg-gradient-to-br from-amber-100 to-slate-800">
                  <Monitor className="h-6 w-6 text-slate-600" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{t("appearance.theme.system")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("appearance.theme.systemDescription")}
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("appearance.currency.title")}
            </CardTitle>
            <CardDescription>{t("appearance.currency.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder={t("appearance.currency.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono w-6">{curr.symbol}</span>
                      <span>{curr.name}</span>
                      <span className="text-muted-foreground">({curr.code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              {t("appearance.currency.hint")}
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notifications Tab */}
      <TabsContent value="notifications" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("notifications.title")}
            </CardTitle>
            <CardDescription>{t("notifications.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("notifications.email.title")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.email.description")}
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("notifications.push.title")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.push.description")}
                </p>
              </div>
              <Switch />
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("notifications.weeklyDigest.title")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.weeklyDigest.description")}
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            {/* Meal Reminders */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("notifications.mealReminders.title")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.mealReminders.description")}
                </p>
              </div>
              <Switch />
            </div>

            {/* Shopping List Reminders */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("notifications.shoppingReminders.title")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.shoppingReminders.description")}
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Seasonality Tab */}
      <TabsContent value="seasonality" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              {tSeasonality("preferences.title")}
            </CardTitle>
            <CardDescription>{tSeasonality("preferences.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingSeasonalPrefs ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-80" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                {/* Country Selection */}
                <div className="space-y-2">
                  <Label>{tSeasonality("preferences.selectCountry")}</Label>
                  <Select value={selectedCountry} onValueChange={handleCountryChange}>
                    <SelectTrigger className="w-full md:w-80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <span className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {tSeasonality("preferences.countryHint")}
                  </p>
                </div>

                {/* Seasonal Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{tSeasonality("preferences.notifications")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {tSeasonality("preferences.notificationsHint")}
                    </p>
                  </div>
                  <Switch
                    checked={seasonalPreferences?.notification_enabled || false}
                    onCheckedChange={handleNotificationChange}
                  />
                </div>

                {/* Favorites Summary */}
                <div className="space-y-2">
                  <Label>{tSeasonality("preferences.yourFavorites")}</Label>
                  {favoritesCount > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {tSeasonality("preferences.favoritesCount", { count: favoritesCount })}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {tSeasonality("preferences.noFavorites")}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </ModuleTabs>

    {/* Profile Create/Edit Dialog */}
    <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {editingProfile ? t("household.editMember") : t("household.addMember")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">{t("household.name")}</Label>
            <Input
              id="profile-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={t("household.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("household.color")}</Label>
            <div className="flex flex-wrap gap-2">
              {PROFILE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setProfileColor(color.value)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    profileColor === color.value
                      ? "border-primary scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSaveProfile} disabled={isCreating || isUpdating}>
            {isCreating || isUpdating ? tCommon("saving") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("household.deleteConfirm.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("household.deleteConfirm.description", { name: profileToDelete?.name ?? "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteProfile}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? tCommon("deleting") : tCommon("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
