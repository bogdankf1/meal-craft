import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "uk"],
  defaultLocale: "en",
  localePrefix: "never", // Hide locale from URL
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
