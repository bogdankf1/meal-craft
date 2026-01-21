"use client";

import { usePathname } from "next/navigation";
import { SpotlightOverlay } from "./SpotlightOverlay";
import { useOnboardingSpotlight } from "./useOnboardingSpotlight";

export function OnboardingSpotlightProvider() {
  const pathname = usePathname();
  const { targets, active, dismissSpotlight } = useOnboardingSpotlight(pathname);

  return (
    <SpotlightOverlay
      targets={targets}
      active={active}
      onOverlayClick={dismissSpotlight}
      overlayOpacity={0.5}
      zIndex={60}
    />
  );
}
