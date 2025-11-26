"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Sidebar, MobileSidebar } from "@/components/shared/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile/Tablet Header */}
        <header className="lg:hidden bg-background border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Link href="/dashboard" className="flex items-center">
            <span className="text-lg font-bold text-primary">MealCraft</span>
          </Link>
          {/* Spacer for centering logo */}
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
