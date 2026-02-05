"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Sidebar, MobileSidebar } from "@/components/shared/Sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, HelpCircle, Settings, Shield } from "lucide-react";
import { OnboardingSpotlightProvider } from "@/components/modules/onboarding";
import { useSession } from "next-auth/react";
import { useGetMeQuery } from "@/lib/api/auth-api";
import { useSidebarSwipe } from "@/lib/hooks/use-sidebar-swipe";
import { useUserStore } from "@/lib/store/user-store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, status: sessionStatus } = useSession();

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
      <div className="flex-1 overflow-y-auto bg-muted/30">
        {/* Mobile/Tablet Header - scrolls with content */}
        <header className="xl:hidden bg-background border-b px-3 py-2 flex items-center justify-between">
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
                  <Shield className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Link href="/help">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/settings">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main>
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Onboarding spotlight overlay */}
      <OnboardingSpotlightProvider />
    </div>
  );
}
