import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatsCard } from "@/components/shared/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  ShoppingCart,
  Carrot,
  BookOpen,
  Dumbbell,
  Plus,
} from "lucide-react";

export default async function DashboardPage() {
  const t = await getTranslations("nav");

  return (
    <div>
      <PageHeader
        title={t("dashboard")}
        description="Welcome back! Here's an overview of your meal planning journey."
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Quick Add
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Meals Planned This Week"
          value="12/21"
          icon={<Calendar className="h-5 w-5 text-primary" />}
          trend={{
            value: "+3",
            label: "vs last week",
            direction: "up",
          }}
        />
        <StatsCard
          title="Recipes Saved"
          value="24"
          icon={<BookOpen className="h-5 w-5 text-primary" />}
          trend={{
            value: "+5",
            label: "this month",
            direction: "up",
          }}
        />
        <StatsCard
          title="Shopping Lists Pending"
          value="2"
          icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        />
        <StatsCard
          title="Items Expiring Soon"
          value="5"
          icon={<Carrot className="h-5 w-5 text-orange-500" />}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Meals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Meals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No meals planned for the next 3 days.
              <br />
              <Button variant="link" className="mt-2">
                Start planning
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Carrot className="mr-2 h-4 w-4" />
              Add Groceries
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Generate Recipe
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              Plan This Week
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Dumbbell className="mr-2 h-4 w-4" />
              Track Nutrition
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No recent activity yet. Start by adding some groceries!
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
