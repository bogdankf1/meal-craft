import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";
import { AuthSyncProvider } from "@/components/providers/auth-sync-provider";
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { UIPreferencesSyncProvider } from "@/components/providers/ui-preferences-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "MealCraft - Your Ultimate Meal Planning Platform",
  description:
    "Plan meals, manage groceries, track nutrition, and more with MealCraft.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <AuthSyncProvider>
            <ReduxProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <NextIntlClientProvider messages={messages}>
                  <CurrencyProvider>
                    <UIPreferencesSyncProvider>
                      {children}
                    </UIPreferencesSyncProvider>
                    <Toaster />
                  </CurrencyProvider>
                </NextIntlClientProvider>
              </ThemeProvider>
            </ReduxProvider>
          </AuthSyncProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
