"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { BookOpen } from "lucide-react";

export function RecipesContent() {
  return (
    <EmptyState
      icon={<BookOpen />}
      title="No recipes yet"
      description="Try adding some groceries first, then generate your first AI recipe!"
      action={{ label: "Generate Recipe", onClick: () => {} }}
    />
  );
}
