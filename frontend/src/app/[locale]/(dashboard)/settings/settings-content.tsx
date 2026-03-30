"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import Cookies from "js-cookie";
import { useTheme } from "next-themes";
import {
  Settings,
  Globe,
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
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Salad,
  LogOut,
  Eye,
  MapPin,
} from "lucide-react";
import { signOut } from "next-auth/react";

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
import { Separator } from "@/components/ui/separator";
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
import { useUserStore } from "@/lib/store/user-store";
import { BackToSetupButton } from "@/components/modules/onboarding";

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
  const tDietary = useTranslations("dietaryRestrictions");
  const tNutritional = useTranslations("nutritionalPreferences");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentLocale = useLocale();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  // Check if we're in onboarding mode
  const isOnboarding = searchParams.get("onboarding") === "true";

  // Currency
  const { currency, currencies, setCurrency } = useCurrency();

  // UI Visibility
  const { preferences, setUIVisibility, minimalView, toggleMinimalView } = useUserStore();
  const uiVisibility = preferences.uiVisibility;

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
  // Expand all profiles when in onboarding mode (initial value from query param)
  const [expandAllProfiles] = useState(isOnboarding);

  // Get selected country for seasonality
  const selectedCountry = seasonalPreferences?.country_code || "UA";

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

  const handleUIVisibilityChange = (key: keyof typeof uiVisibility, value: boolean) => {
    setUIVisibility({ [key]: value });
    toast.success(t("appearance.interfaceCustomization.settingsUpdated"));
  };

  const handleCountryChange = async (countryCode: string) => {
    try {
      await updateSeasonalPreferences({ country_code: countryCode }).unwrap();
      toast.success(t("messages.countryChanged"));
    } catch {
      toast.error(t("messages.errorUpdatingCountry"));
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
        {/* Card 1: Language & Region */}
        <Card className="shadow-sm border-0">
          <CardHeader className="bg-[var(--green-ghost)] rounded-t-[1.375rem] pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[var(--green-wash)] flex items-center justify-center">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-[15px] font-medium text-primary">
                  Language &amp; Region
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Set your language, location, and currency
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-0">
            {/* Language */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4">
              <div>
                <p className="text-sm font-medium">{t("general.language.title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("general.language.description")}
                </p>
              </div>
              <Select value={currentLocale} onValueChange={handleLanguageChange} disabled={isPending}>
                <SelectTrigger className="w-full sm:w-48 rounded-xl border-0 bg-[var(--green-ghost)]">
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
            </div>

            <Separator />

            {/* Country */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4">
              <div>
                <p className="text-sm font-medium">{t("general.country.title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("general.country.description")}
                </p>
              </div>
              {isLoadingSeasonalPrefs ? (
                <Skeleton className="h-10 w-full sm:w-48" />
              ) : (
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger className="w-full sm:w-48 rounded-xl border-0 bg-[var(--green-ghost)]">
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
              )}
            </div>

            <Separator />

            {/* Currency */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4">
              <div>
                <p className="text-sm font-medium">{t("general.currency.title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("general.currency.description")}
                </p>
              </div>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-full sm:w-48 rounded-xl border-0 bg-[var(--green-ghost)]">
                  <SelectValue placeholder={t("general.currency.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono w-6">{curr.symbol}</span>
                        <span>{curr.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Appearance */}
        <Card className="shadow-sm border-0">
          <CardHeader className="bg-[var(--green-ghost)] rounded-t-[1.375rem] pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[var(--green-wash)] flex items-center justify-center">
                <Sun className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-[15px] font-medium text-primary">
                  Appearance
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Choose your theme and display preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground mb-3">Theme</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                { value: "light", label: t("appearance.theme.light"), desc: t("appearance.theme.lightDescription"), icon: Sun },
                { value: "dark", label: t("appearance.theme.dark"), desc: t("appearance.theme.darkDescription"), icon: Moon },
                { value: "system", label: t("appearance.theme.system"), desc: t("appearance.theme.systemDescription"), icon: Monitor },
              ].map(({ value, label, desc, icon: Icon }) => {
                const sel = theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleThemeChange(value)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-2xl text-center cursor-pointer transition-shadow",
                      sel
                        ? "border-2 border-primary bg-[var(--green-ghost)]"
                        : "border-0 bg-card shadow-sm hover:shadow-md"
                    )}
                  >
                    <div
                      className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center",
                        sel ? "bg-[var(--green-wash)]" : "bg-muted"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          sel ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", sel && "text-primary")}>
                        {label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Separator />

            {/* Minimal View Toggle */}
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium">{t("appearance.minimalView.label")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("appearance.minimalView.description")}
                </p>
              </div>
              <Switch
                checked={minimalView}
                onCheckedChange={toggleMinimalView}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Sign Out */}
        <Card className="shadow-sm border-0">
          <CardContent className="py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--error-bg)] flex items-center justify-center">
                <LogOut className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Sign Out</p>
                <p className="text-xs text-muted-foreground">End your current session</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-xl border-destructive/30 bg-[var(--error-bg)] text-destructive hover:bg-destructive hover:text-white"
            >
              {t("general.account.logout")}
            </Button>
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
              <Button onClick={openCreateProfileDialog} data-spotlight="add-member-button">
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
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
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
                    {(expandedProfileId === profile.id || expandAllProfiles) && (
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
              <div className="text-center py-8 text-muted-foreground" data-spotlight="add-first-member">
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

    {/* Back to Setup button for onboarding */}
    <BackToSetupButton stepId="household" />
    </>
  );
}
