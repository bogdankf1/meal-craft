"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Shared tab navigation helper used by the dashboard module content pages.
 * Preserves the existing query string and sets the `tab` param.
 */
export function useModuleTabNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigateToTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  };

  return { navigateToTab };
}
