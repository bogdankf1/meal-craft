"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface SpotlightTarget {
  /** CSS selector for the element to highlight */
  selector: string;
  /** Optional padding around the highlighted element */
  padding?: number;
  /** Optional border radius for the highlight */
  borderRadius?: number;
}

interface SpotlightOverlayProps {
  /** Array of targets to highlight */
  targets: SpotlightTarget[];
  /** Whether the spotlight is active */
  active: boolean;
  /** Callback when clicking the overlay (dimmed area) */
  onOverlayClick?: () => void;
  /** Optional className for the overlay */
  className?: string;
  /** Opacity of the dimmed overlay (0-1) */
  overlayOpacity?: number;
  /** Z-index for the overlay */
  zIndex?: number;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: number;
}

export function SpotlightOverlay({
  targets,
  active,
  onOverlayClick,
  className,
  overlayOpacity = 0.5,
  zIndex = 40,
}: SpotlightOverlayProps) {
  const [highlights, setHighlights] = useState<HighlightRect[]>([]);
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const calculateHighlights = useCallback(() => {
    const rects: HighlightRect[] = [];

    for (const target of targets) {
      const elements = document.querySelectorAll(target.selector);
      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const padding = target.padding ?? 8;
        const borderRadius = target.borderRadius ?? 8;

        rects.push({
          top: rect.top - padding + window.scrollY,
          left: rect.left - padding + window.scrollX,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          borderRadius,
        });
      });
    }

    requestAnimationFrame(() => {
      setHighlights(rects);
    });
  }, [targets]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!active || !mounted) return;

    // Initial calculation with small delay to ensure DOM is ready
    const initialTimer = setTimeout(calculateHighlights, 100);

    // Recalculate on scroll and resize
    const handleUpdate = () => {
      requestAnimationFrame(calculateHighlights);
    };

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    // Use MutationObserver to detect DOM changes
    const observer = new MutationObserver(handleUpdate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
      observer.disconnect();
    };
  }, [active, mounted, calculateHighlights]);

  // Handle clicks - dismiss spotlight on any click (both on highlighted elements and dimmed area)
  useEffect(() => {
    if (!active || !mounted || highlights.length === 0) return;

    const handleClick = (e: MouseEvent) => {
      // Check if click is on the dismiss button (it has its own handler)
      const target = e.target as HTMLElement;
      if (target.closest('[data-spotlight-dismiss]')) {
        return;
      }

      // Dismiss spotlight on any click - the click will still propagate to the element
      if (onOverlayClick) {
        onOverlayClick();
      }
    };

    // Use capture phase to intercept clicks before they reach elements
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [active, mounted, highlights, onOverlayClick]);

  if (!active || !mounted || highlights.length === 0) {
    return null;
  }

  const overlay = (
    <div
      ref={overlayRef}
      className={cn("fixed inset-0 pointer-events-none", className)}
      style={{ zIndex }}
    >
      {/* Visual overlay with holes - pointer-events: none so clicks pass through */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlights.map((rect, index) => (
              <rect
                key={index}
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={rect.borderRadius}
                ry={rect.borderRadius}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`rgba(0, 0, 0, ${overlayOpacity})`}
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Dismiss button */}
      {onOverlayClick && (
        <Button
          data-spotlight-dismiss
          variant="secondary"
          size="icon"
          onClick={onOverlayClick}
          className="absolute top-16 sm:top-4 right-4 pointer-events-auto shadow-lg"
          aria-label="Dismiss spotlight"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Highlight borders */}
      {highlights.map((rect, index) => (
        <div
          key={index}
          className="absolute ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: rect.borderRadius,
          }}
        />
      ))}
    </div>
  );

  return createPortal(overlay, document.body);
}
