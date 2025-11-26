import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GroceriesContent } from "./groceries-content";

export default async function GroceriesPage() {
  const t = await getTranslations("nav");

  return (
    <div>
      <PageHeader
        title={t("groceries")}
        description="Track your grocery purchases and manage your inventory."
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Groceries
          </Button>
        }
      />
      <Suspense fallback={<div>Loading...</div>}>
        <GroceriesContent />
      </Suspense>
    </div>
  );
}
