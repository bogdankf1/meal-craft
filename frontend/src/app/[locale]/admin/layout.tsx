"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Users,
  Crown,
  BarChart3,
  MessageSquare,
  ChevronLeft,
  Menu,
  LogOut,
  X,
  Banknote,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useGetMeQuery } from "@/lib/api/auth-api";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "users", icon: Users },
  { href: "/admin/tiers", label: "tiers", icon: Crown },
  { href: "/admin/currencies", label: "currencies", icon: Banknote },
  { href: "/admin/analytics", label: "analytics", icon: BarChart3 },
  { href: "/admin/support", label: "support", icon: MessageSquare },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const { data: userData, isLoading: userLoading } = useGetMeQuery(undefined, {
    skip: sessionStatus !== "authenticated",
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("admin-sidebar-collapsed") === "true";
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!userLoading && userData && userData.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [userData, userLoading, router]);

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem("admin-sidebar-collapsed", String(newValue));
  };

  const isActive = (href: string) => {
    // Exact match for /admin, prefix match for others
    if (href === "/admin") {
      return pathname === "/admin" || pathname.match(/^\/[a-z]{2}\/admin$/);
    }
    return pathname.includes(href);
  };

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "A";

  // Show loading while checking auth
  if (sessionStatus === "loading" || userLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Block non-admins
  if (!userData || userData.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-background border-r transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {!isCollapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">
                {t("title")}
              </span>
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
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {adminNavItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{t(`nav.${item.label}`)}</span>}
              </Button>
            </Link>
          ))}

          <Separator className="my-4" />

          {/* Back to Dashboard */}
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-muted-foreground",
                isCollapsed && "justify-center px-2"
              )}
            >
              <ChevronLeft className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{t("nav.backToDashboard")}</span>}
            </Button>
          </Link>
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
                  {session?.user?.name || "Admin"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl transition-transform duration-300 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-14 px-4 border-b">
            <Link href="/admin" onClick={() => setSidebarOpen(false)}>
              <span className="text-xl font-bold text-primary">
                {t("title")}
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
              >
                <Button
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{t(`nav.${item.label}`)}</span>
                </Button>
              </Link>
            ))}

            <Separator className="my-4" />

            <Link href="/dashboard" onClick={() => setSidebarOpen(false)}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span>{t("nav.backToDashboard")}</span>
              </Button>
            </Link>
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
                  {session?.user?.name || "Admin"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-background border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <span className="text-lg font-bold text-primary">{t("title")}</span>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
