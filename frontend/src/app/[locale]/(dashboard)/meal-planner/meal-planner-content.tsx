"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Calendar } from "lucide-react";

export function MealPlannerContent() {
  return (
    <EmptyState
      icon={<Calendar />}
      title="No meal plans yet"
      description="Start by adding some recipes to your library, then create your first weekly meal plan!"
      action={{ label: "Create Meal Plan", onClick: () => {} }}
    />
  );
}
