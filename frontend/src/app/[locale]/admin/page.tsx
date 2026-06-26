"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  UserPlus,
  CreditCard,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import {
  useGetPlatformStatsQuery,
  useGetUserAcquisitionQuery,
  useGetEngagementMetricsQuery,
} from "@/lib/api/admin-api";
import { UserAcquisitionChart } from "@/components/charts/UserAcquisitionChart";
import { format, parseISO } from "date-fns";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin");

  const { data: stats, isLoading: statsLoading } = useGetPlatformStatsQuery();
  const { data: acquisitionData, isLoading: acquisitionLoading } =
    useGetUserAcquisitionQuery(30);
  const { data: engagement, isLoading: engagementLoading } =
    useGetEngagementMetricsQuery();

  // Format acquisition data for chart
  const chartData =
    acquisitionData?.map((item) => ({
      date: format(parseISO(item.date), "MMM d"),
      users: item.count,
    })) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title={t("dashboard.stats.totalUsers")}
          value={stats?.total_users || 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title={t("dashboard.stats.activeUsers")}
          value={stats?.active_users || 0}
          description={
            stats
              ? `${((stats.active_users / stats.total_users) * 100).toFixed(1)}% ${t("dashboard.stats.ofTotal")}`
              : undefined
          }
          icon={UserCheck}
          loading={statsLoading}
        />
        <StatCard
          title={t("dashboard.stats.newThisMonth")}
          value={stats?.new_users_this_month || 0}
          icon={UserPlus}
          loading={statsLoading}
        />
        <StatCard
          title={t("dashboard.stats.activeSubscriptions")}
          value={stats?.active_subscriptions || 0}
          icon={CreditCard}
          loading={statsLoading}
        />
        <StatCard
          title={t("dashboard.stats.mrr")}
          value={stats ? `$${stats.mrr.toFixed(2)}` : "$0.00"}
          icon={DollarSign}
          loading={statsLoading}
        />
        <StatCard
          title={t("dashboard.stats.churnRate")}
          value={stats ? `${stats.churn_rate.toFixed(1)}%` : "0%"}
          icon={TrendingDown}
          loading={statsLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Acquisition Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("dashboard.charts.userAcquisition")}</CardTitle>
            <CardDescription>
              {t("dashboard.charts.last30Days")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserAcquisitionChart data={chartData} loading={acquisitionLoading} />
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("dashboard.charts.engagement")}</CardTitle>
            <CardDescription>
              {t("dashboard.charts.engagementDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {engagementLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">
                      {t("dashboard.engagement.dau")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.engagement.dauDescription")}
                    </p>
                  </div>
                  <span className="text-2xl font-bold">
                    {engagement?.dau || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">
                      {t("dashboard.engagement.wau")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.engagement.wauDescription")}
                    </p>
                  </div>
                  <span className="text-2xl font-bold">
                    {engagement?.wau || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">
                      {t("dashboard.engagement.mau")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.engagement.mauDescription")}
                    </p>
                  </div>
                  <span className="text-2xl font-bold">
                    {engagement?.mau || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">
                      {t("dashboard.engagement.retention")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.engagement.retentionDescription")}
                    </p>
                  </div>
                  <span className="text-2xl font-bold">
                    {engagement?.retention_rate_30d?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">
                      {t("dashboard.engagement.avgSession")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.engagement.avgSessionDescription")}
                    </p>
                  </div>
                  <span className="text-2xl font-bold">
                    {engagement?.avg_session_duration?.toFixed(1) || 0}{" "}
                    {t("dashboard.engagement.minutes")}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
