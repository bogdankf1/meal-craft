"use client";

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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  useGetUserSeasonalPreferencesQuery,
  useUpdateUserSeasonalPreferencesMutation,
  useGetSeasonalProduceQuery,
  SUPPORTED_COUNTRIES,
} from "@/lib/api/seasonality-api";

// Supported currencies
const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
];

// Supported languages
const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
];

export function SettingsContent() {
  const t = useTranslations("settings");
  const tSeasonality = useTranslations("seasonality");
  const router = useRouter();
  const currentLocale = useLocale();
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  // Seasonality preferences
  const { data: seasonalPreferences, isLoading: isLoadingSeasonalPrefs } = useGetUserSeasonalPreferencesQuery();
  const [updateSeasonalPreferences] = useUpdateUserSeasonalPreferencesMutation();

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

  return (
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

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("general.currency.title")}
            </CardTitle>
            <CardDescription>{t("general.currency.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select defaultValue="UAH">
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder={t("general.currency.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{currency.symbol}</span>
                      <span>{currency.name}</span>
                      <span className="text-muted-foreground">({currency.code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              {t("general.currency.hint")}
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Appearance Tab */}
      <TabsContent value="appearance" className="space-y-6">
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
  );
}
