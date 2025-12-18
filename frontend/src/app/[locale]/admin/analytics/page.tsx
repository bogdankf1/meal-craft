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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingDown,
  Activity,
  Database,
} from "lucide-react";
import {
  useGetPlatformStatsQuery,
  useGetUserAcquisitionQuery,
  useGetEngagementMetricsQuery,
  useGetModuleUsageQuery,
} from "@/lib/api/admin-api";
import { AcquisitionLineChart } from "@/components/charts/AcquisitionLineChart";
import { AcquisitionBarChart } from "@/components/charts/AcquisitionBarChart";
import { format, parseISO } from "date-fns";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  trend?: "up" | "down" | "neutral";
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
              <p className={`text-xs ${
                trend === "up" ? "text-green-500" :
                trend === "down" ? "text-red-500" :
                "text-muted-foreground"
              }`}>
                {description}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const t = useTranslations("admin");

  const { data: stats, isLoading: statsLoading } = useGetPlatformStatsQuery();
  const { data: acquisition30, isLoading: acquisition30Loading } =
    useGetUserAcquisitionQuery(30);
  const { data: acquisition90, isLoading: acquisition90Loading } =
    useGetUserAcquisitionQuery(90);
  const { data: engagement, isLoading: engagementLoading } =
    useGetEngagementMetricsQuery();
  const { data: moduleUsage, isLoading: moduleUsageLoading } =
    useGetModuleUsageQuery();

  // Format acquisition data for charts
  const chartData30 =
    acquisition30?.map((item) => ({
      date: format(parseISO(item.date), "MMM d"),
      users: item.count,
    })) || [];

  const chartData90 =
    acquisition90?.map((item) => ({
      date: format(parseISO(item.date), "MMM d"),
      users: item.count,
    })) || [];

  // Calculate DAU/MAU ratio
  const dauMauRatio =
    engagement && engagement.mau > 0
      ? ((engagement.dau / engagement.mau) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("analytics.title")}
        description={t("analytics.description")}
      />

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("analytics.metrics.totalUsers")}
          value={stats?.total_users || 0}
          description={`+${stats?.new_users_today || 0} ${t("analytics.metrics.today")}`}
          icon={Users}
          loading={statsLoading}
          trend={stats?.new_users_today && stats.new_users_today > 0 ? "up" : "neutral"}
        />
        <StatCard
          title={t("analytics.metrics.activeUsers")}
          value={stats?.active_users || 0}
          description={
            stats && stats.total_users > 0
              ? `${((stats.active_users / stats.total_users) * 100).toFixed(1)}% ${t("analytics.metrics.ofTotal")}`
              : undefined
          }
          icon={UserCheck}
          loading={statsLoading}
        />
        <StatCard
          title={t("analytics.metrics.mrr")}
          value={stats ? `$${stats.mrr.toFixed(2)}` : "$0.00"}
          description={stats ? `ARR: $${stats.arr.toFixed(2)}` : undefined}
          icon={DollarSign}
          loading={statsLoading}
        />
        <StatCard
          title={t("analytics.metrics.churnRate")}
          value={stats ? `${stats.churn_rate.toFixed(1)}%` : "0%"}
          icon={TrendingDown}
          loading={statsLoading}
          trend={stats?.churn_rate && stats.churn_rate > 5 ? "down" : "neutral"}
        />
      </div>

      {/* User Acquisition Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.charts.acquisition30")}</CardTitle>
            <CardDescription>{t("analytics.charts.acquisition30Desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AcquisitionLineChart data={chartData30} loading={acquisition30Loading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.charts.acquisition90")}</CardTitle>
            <CardDescription>{t("analytics.charts.acquisition90Desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AcquisitionBarChart data={chartData90} loading={acquisition90Loading} />
          </CardContent>
        </Card>
      </div>

      {/* Engagement & Module Usage */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("analytics.engagement.title")}
            </CardTitle>
            <CardDescription>{t("analytics.engagement.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {engagementLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{engagement?.dau || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("analytics.engagement.dau")}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{engagement?.wau || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("analytics.engagement.wau")}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{engagement?.mau || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("analytics.engagement.mau")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">{dauMauRatio}%</p>
                    <p className="text-xs text-muted-foreground">{t("analytics.engagement.dauMauRatio")}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold">
                      {engagement?.retention_rate_30d?.toFixed(1) || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">{t("analytics.engagement.retention30")}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Module Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t("analytics.moduleUsage.title")}
            </CardTitle>
            <CardDescription>{t("analytics.moduleUsage.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {moduleUsageLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("analytics.moduleUsage.module")}</TableHead>
                      <TableHead className="text-right">{t("analytics.moduleUsage.items")}</TableHead>
                      <TableHead className="text-right">{t("analytics.moduleUsage.users")}</TableHead>
                      <TableHead className="text-right">{t("analytics.moduleUsage.thisWeek")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moduleUsage?.map((module) => (
                      <TableRow key={module.module}>
                        <TableCell className="font-medium capitalize">
                          {module.module.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-right">{module.total_items}</TableCell>
                        <TableCell className="text-right">{module.active_users}</TableCell>
                        <TableCell className="text-right">{module.items_created_this_week}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
