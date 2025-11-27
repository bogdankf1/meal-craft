"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  ShoppingCart,
  Carrot,
  Archive,
  Utensils,
  Pizza,
  Dumbbell,
  Leaf,
  GraduationCap,
  Heart,
  Download,
  RefreshCw,
  HelpCircle,
  Settings,
  Shield,
  ChevronLeft,
  Menu,
  Sun,
  Moon,
  Monitor,
  LogOut,
  LogIn,
  X,
  CreditCard,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useGetMeQuery } from "@/lib/api/auth-api";

// Extended session type that includes backend fields (matches auth.ts module augmentation)
interface ExtendedSession extends Session {
  subscriptionTier?: string;
}

// Custom hook to safely detect client-side mounting without triggering ESLint warnings
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "planning",
    items: [
      { href: "/meal-planner", label: "mealPlanner", icon: Calendar },
      { href: "/recipes", label: "recipes", icon: BookOpen },
      { href: "/shopping-lists", label: "shoppingLists", icon: ShoppingCart },
    ],
  },
  {
    label: "inventory",
    items: [
      { href: "/groceries", label: "groceries", icon: Carrot },
      { href: "/pantry", label: "pantry", icon: Archive },
      { href: "/kitchen-equipment", label: "kitchenEquipment", icon: Utensils },
    ],
  },
  {
    label: "tracking",
    items: [
      { href: "/restaurants", label: "restaurants", icon: Pizza },
      { href: "/nutrition", label: "nutrition", icon: Dumbbell },
    ],
  },
  {
    label: "lifestyle",
    items: [
      { href: "/seasonality", label: "seasonality", icon: Leaf },
      { href: "/learning", label: "learning", icon: GraduationCap },
      { href: "/health", label: "health", icon: Heart },
    ],
  },
  {
    label: "tools",
    items: [
      { href: "/export", label: "export", icon: Download },
      { href: "/backups", label: "backups", icon: RefreshCw },
      { href: "/help", label: "help", icon: HelpCircle },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const t = useTranslations("nav");
  const tTiers = useTranslations("tiers");
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale();
  const { theme, setTheme } = useTheme();
  const { data: session, status: sessionStatus } = useSession();

  // Fetch user data from backend (includes current subscription tier)
  const { data: userData } = useGetMeQuery(undefined, {
    skip: sessionStatus !== "authenticated",
  });

  const mounted = useIsMounted();

  // Initialize state with values from localStorage (SSR-safe with lazy init)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [isPending, startTransition] = useTransition();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return ["planning", "inventory", "tracking", "lifestyle", "tools"];
    }
    const saved = localStorage.getItem("sidebar-expanded-groups");
    return saved ? JSON.parse(saved) : ["planning", "inventory", "tracking", "lifestyle", "tools"];
  });

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem("sidebar-collapsed", String(newValue));
  };

  const handleGroupChange = (value: string[]) => {
    setExpandedGroups(value);
    localStorage.setItem("sidebar-expanded-groups", JSON.stringify(value));
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const switchLocale = (newLocale: string) => {
    Cookies.set("NEXT_LOCALE", newLocale, { expires: 365 });
    startTransition(() => {
      router.refresh();
    });
  };

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  // Get user initials
  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Get subscription tier - prefer backend data, fallback to session
  const extendedSession = session as ExtendedSession | null;
  const subscriptionTier = userData?.subscription_tier || extendedSession?.subscriptionTier || "FREE";
  const tierKey = subscriptionTier.toLowerCase() as "free" | "plus" | "pro";

  // Suppress unused variable warning - onClose is part of the shared interface
  void onClose;

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-background border-r transition-all duration-300",
        // Desktop: static sidebar with collapse
        "hidden lg:flex",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">MealCraft</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="shrink-0"
        >
          {isCollapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Dashboard link */}
        <div className="px-3 mb-2">
          <Link href="/dashboard">
            <Button
              variant={isActive("/dashboard") ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                isCollapsed && "justify-center px-2"
              )}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{t("dashboard")}</span>}
            </Button>
          </Link>
        </div>

        <Separator className="my-2" />

        {/* Collapsible groups */}
        {isCollapsed ? (
          // Collapsed view - just icons
          <div className="px-3 space-y-1">
            {navGroups.flatMap((group) =>
              group.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    size="icon"
                    className="w-full"
                    title={t(item.label)}
                  >
                    <item.icon className="h-5 w-5" />
                  </Button>
                </Link>
              ))
            )}
          </div>
        ) : (
          // Expanded view - accordion groups
          <Accordion
            type="multiple"
            value={expandedGroups}
            onValueChange={handleGroupChange}
            className="px-3"
          >
            {navGroups.map((group) => (
              <AccordionItem
                key={group.label}
                value={group.label}
                className="border-none"
              >
                <AccordionTrigger className="py-2 text-xs font-semibold uppercase text-muted-foreground hover:no-underline">
                  {t(group.label)}
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive(item.href) ? "secondary" : "ghost"}
                          className="w-full justify-start gap-3"
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span>{t(item.label)}</span>
                        </Button>
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <Separator className="my-2" />

        {/* Settings */}
        <div className="px-3 space-y-1">
          <Link href="/pricing">
            <Button
              variant={isActive("/pricing") ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                isCollapsed && "justify-center px-2"
              )}
            >
              <CreditCard className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{t("pricing")}</span>}
            </Button>
          </Link>
          <Link href="/settings">
            <Button
              variant={isActive("/settings") ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                isCollapsed && "justify-center px-2"
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{t("settings")}</span>}
            </Button>
          </Link>
        </div>

        {/* Admin link (if admin) */}
        {session?.user && (
          <>
            <Separator className="my-2" />
            <div className="px-3">
              <Link href="/admin">
                <Button
                  variant={isActive("/admin") ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Shield className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{t("admin")}</span>}
                </Button>
              </Link>
            </div>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed && "flex-col gap-2"
          )}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={session?.user?.image || undefined} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session?.user?.name || "Guest"}
              </p>
              <Badge variant="secondary" className="text-xs">
                {tTiers(tierKey)}
              </Badge>
            </div>
          )}
        </div>

        {/* Theme and language toggles */}
        <div
          className={cn(
            "flex items-center gap-2 mt-3",
            isCollapsed && "flex-col"
          )}
        >
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={cycleTheme}
              title={theme}
            >
              <ThemeIcon className="h-5 w-5" />
            </Button>
          )}
          <div className="flex gap-1">
            <Button
              variant={currentLocale === "uk" ? "secondary" : "ghost"}
              size="sm"
              className="px-2 text-xs"
              onClick={() => switchLocale("uk")}
              disabled={isPending}
            >
              UA
            </Button>
            <Button
              variant={currentLocale === "en" ? "secondary" : "ghost"}
              size="sm"
              className="px-2 text-xs"
              onClick={() => switchLocale("en")}
              disabled={isPending}
            >
              EN
            </Button>
          </div>
          {/* Login/Logout button */}
          {session ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="icon" title="Sign in">
                <LogIn className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}

// Mobile Sidebar - Drawer version
export function MobileSidebar({ isOpen, onClose }: SidebarProps) {
  const t = useTranslations("nav");
  const tTiers = useTranslations("tiers");
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale();
  const { theme, setTheme } = useTheme();
  const { data: session, status: sessionStatus } = useSession();

  // Fetch user data from backend (includes current subscription tier)
  const { data: userData } = useGetMeQuery(undefined, {
    skip: sessionStatus !== "authenticated",
  });

  const mounted = useIsMounted();
  const [isPending, startTransition] = useTransition();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return ["planning", "inventory", "tracking", "lifestyle", "tools"];
    }
    const saved = localStorage.getItem("sidebar-expanded-groups");
    return saved ? JSON.parse(saved) : ["planning", "inventory", "tracking", "lifestyle", "tools"];
  });

  const handleGroupChange = (value: string[]) => {
    setExpandedGroups(value);
    localStorage.setItem("sidebar-expanded-groups", JSON.stringify(value));
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const switchLocale = (newLocale: string) => {
    Cookies.set("NEXT_LOCALE", newLocale, { expires: 365 });
    startTransition(() => {
      router.refresh();
    });
  };

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Get subscription tier - prefer backend data, fallback to session
  const extendedSession = session as ExtendedSession | null;
  const subscriptionTier = userData?.subscription_tier || extendedSession?.subscriptionTier || "FREE";
  const tierKey = subscriptionTier.toLowerCase() as "free" | "plus" | "pro";

  // Handle navigation click - close sidebar
  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-14 px-4 border-b">
            <Link
              href="/dashboard"
              className="flex items-center gap-2"
              onClick={handleNavClick}
            >
              <span className="text-xl font-bold text-primary">MealCraft</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {/* Dashboard link */}
            <div className="px-3 mb-2">
              <Link href="/dashboard" onClick={handleNavClick}>
                <Button
                  variant={isActive("/dashboard") ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <LayoutDashboard className="h-5 w-5 shrink-0" />
                  <span>{t("dashboard")}</span>
                </Button>
              </Link>
            </div>

            <Separator className="my-2" />

            {/* Accordion groups */}
            <Accordion
              type="multiple"
              value={expandedGroups}
              onValueChange={handleGroupChange}
              className="px-3"
            >
              {navGroups.map((group) => (
                <AccordionItem
                  key={group.label}
                  value={group.label}
                  className="border-none"
                >
                  <AccordionTrigger className="py-2 text-xs font-semibold uppercase text-muted-foreground hover:no-underline">
                    {t(group.label)}
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleNavClick}
                        >
                          <Button
                            variant={
                              isActive(item.href) ? "secondary" : "ghost"
                            }
                            className="w-full justify-start gap-3"
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span>{t(item.label)}</span>
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <Separator className="my-2" />

            {/* Pricing & Settings */}
            <div className="px-3 space-y-1">
              <Link href="/pricing" onClick={handleNavClick}>
                <Button
                  variant={isActive("/pricing") ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <CreditCard className="h-5 w-5 shrink-0" />
                  <span>{t("pricing")}</span>
                </Button>
              </Link>
              <Link href="/settings" onClick={handleNavClick}>
                <Button
                  variant={isActive("/settings") ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  <span>{t("settings")}</span>
                </Button>
              </Link>
            </div>

            {/* Admin link */}
            {session?.user && (
              <>
                <Separator className="my-2" />
                <div className="px-3">
                  <Link href="/admin" onClick={handleNavClick}>
                    <Button
                      variant={isActive("/admin") ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <Shield className="h-5 w-5 shrink-0" />
                      <span>{t("admin")}</span>
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session?.user?.name || "Guest"}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {tTiers(tierKey)}
                </Badge>
              </div>
            </div>

            {/* Theme, language, and logout */}
            <div className="flex items-center gap-2 mt-3">
              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cycleTheme}
                  title={theme}
                >
                  <ThemeIcon className="h-5 w-5" />
                </Button>
              )}
              <div className="flex gap-1">
                <Button
                  variant={currentLocale === "uk" ? "secondary" : "ghost"}
                  size="sm"
                  className="px-2 text-xs"
                  onClick={() => switchLocale("uk")}
                  disabled={isPending}
                >
                  UA
                </Button>
                <Button
                  variant={currentLocale === "en" ? "secondary" : "ghost"}
                  size="sm"
                  className="px-2 text-xs"
                  onClick={() => switchLocale("en")}
                  disabled={isPending}
                >
                  EN
                </Button>
              </div>
              {session ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              ) : (
                <Link href="/login" onClick={handleNavClick}>
                  <Button variant="ghost" size="icon" title="Sign in">
                    <LogIn className="h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
