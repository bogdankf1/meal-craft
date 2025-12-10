"use client";

import { use } from "react";
import { ShoppingListDetail } from "@/components/modules/shopping-lists";

interface ShoppingListDetailPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export default function ShoppingListDetailPage({
  params,
}: ShoppingListDetailPageProps) {
  const { id } = use(params);

  return <ShoppingListDetail listId={id} />;
}
