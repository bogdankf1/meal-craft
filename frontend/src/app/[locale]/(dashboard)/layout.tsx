"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Sidebar, MobileSidebar } from "@/components/shared/Sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, HelpCircle, Settings, Shield, Home, Calendar, Package, BookOpen, User } from "lucide-react";
import { OnboardingSpotlightProvider } from "@/components/modules/onboarding";
import { useSession } from "next-auth/react";
import { useGetMeQuery } from "@/lib/api/auth-api";
import { useSidebarSwipe } from "@/lib/hooks/use-sidebar-swipe";
import { useUserStore } from "@/lib/store/user-store";
import { cn } from "@/lib/utils";

const BOTTOM_TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/meal-planner", label: "Planner", icon: Calendar },
  { href: "/pantry", label: "Pantry", icon: Package },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/settings", label: "Profile", icon: User },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();

  // Fetch user data to check admin role
  const { data: userData } = useGetMeQuery(undefined, {
    skip: sessionStatus !== "authenticated",
  });

  // Get swipe gesture setting
  const { preferences } = useUserStore();
  const swipeEnabled = preferences.uiVisibility.enableSidebarSwipeGesture;

  // Sidebar swipe gesture (only active when enabled in settings)
  const { sidebarRef, backdropRef, isDragging } = useSidebarSwipe({
    isOpen: sidebarOpen,
    setIsOpen: setSidebarOpen,
    sidebarWidth: 288, // w-72 = 18rem = 288px
    enabled: swipeEnabled,
  });

  const isAdmin = userData?.role === "ADMIN";

  // Get user initials for avatar fallback
  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Check if a tab is active
  const isTabActive = (href: string) => {
    // Strip locale prefix for comparison
    const cleanPath = pathname.replace(/^\/(en|uk)/, "") || "/";
    return cleanPath === href || cleanPath.startsWith(href + "/");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sidebarRef={sidebarRef}
        backdropRef={backdropRef}
        isDragging={isDragging}
      />

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto bg-background">
        {/* Mobile/Tablet Header - minimal, hidden on desktop */}
        <header className="xl:hidden bg-card border-b border-border px-4 py-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-1">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 dark:text-amber-500">
                  <Shield className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href="/help">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/settings">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main>
          <div className="p-4 sm:p-6 lg:p-8 pb-20 xl:pb-8 max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="xl:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-50">
          <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {BOTTOM_TABS.map(({ href, label, icon: Icon }) => {
              const active = isTabActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[3rem]",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className={cn("text-[10px]", active ? "font-medium" : "font-normal")}>{label}</span>
                  {active && <div className="h-0.5 w-0.5 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Onboarding spotlight overlay */}
      <OnboardingSpotlightProvider />
    </div>
  );
}
