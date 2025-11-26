import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate that the incoming locale is valid
  if (!routing.locales.includes(locale as "en" | "uk")) {
    notFound();
  }

  return children;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
