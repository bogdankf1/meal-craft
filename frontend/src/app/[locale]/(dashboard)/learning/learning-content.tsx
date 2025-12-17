"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Library,
  GraduationCap,
  BarChart3,
  Plus,
  Search,
  Star,
  Target,
  Clock,
  Trophy,
  Flame,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

import {
  ModuleTabs,
  TabsContent,
  StatsCard,
  EmptyState,
  AnalyticsCard,
  DistributionList,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetUserSkillsQuery,
  useGetSkillsQuery,
  useGetLearningPathsQuery,
  useGetUserLearningPathsQuery,
  useGetLearningAnalyticsQuery,
  useGetLearningHistoryQuery,
  useAddUserSkillMutation,
  useUpdateUserSkillMutation,
  useRemoveUserSkillMutation,
  useStartLearningPathMutation,
  useAddAllPathSkillsMutation,
  type UserSkill,
  type Skill,
  type LearningPath,
  type UserSkillFilters,
  type SkillFilters,
  SKILL_CATEGORIES,
  SKILL_DIFFICULTIES,
  USER_SKILL_STATUSES,
  PROFICIENCY_LEVELS,
} from "@/lib/api/learning-api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export function LearningContent() {
  const t = useTranslations("learning");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();

  // State for user skills (Overview tab)
  const [userSkillFilters, setUserSkillFilters] = useState<UserSkillFilters>({
    page: 1,
    per_page: 20,
    sort_by: "created_at",
    sort_order: "desc",
  });

  // State for library skills
  const [libraryFilters, setLibraryFilters] = useState<SkillFilters>({
    page: 1,
    per_page: 20,
    sort_by: "name",
    sort_order: "asc",
  });

  const [historyMonths, setHistoryMonths] = useState(3);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [librarySearchQuery, setLibrarySearchQuery] = useState(() => searchParams.get("search") || "");

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // API queries
  const { data: userSkillsData, isLoading: isLoadingUserSkills } =
    useGetUserSkillsQuery({
      ...userSkillFilters,
      search: searchQuery || undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    });

  const { data: libraryData, isLoading: isLoadingLibrary } = useGetSkillsQuery({
    ...libraryFilters,
    search: librarySearchQuery || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    difficulty: difficultyFilter !== "all" ? difficultyFilter : undefined,
  });

  const { data: learningPaths, isLoading: isLoadingPaths } =
    useGetLearningPathsQuery({ is_active: true });

  const { data: userPaths } = useGetUserLearningPathsQuery({});

  const { data: analytics } = useGetLearningAnalyticsQuery();

  const { data: historyData } = useGetLearningHistoryQuery(historyMonths);

  // Mutations
  const [addUserSkill] = useAddUserSkillMutation();
  const [updateUserSkill] = useUpdateUserSkillMutation();
  const [removeUserSkill] = useRemoveUserSkillMutation();
  const [startPath] = useStartLearningPathMutation();
  const [addAllPathSkills] = useAddAllPathSkillsMutation();

  // Create a set of mastered skill IDs for quick lookup
  const masteredSkillIds = new Set(
    userSkillsData?.items
      .filter((us) => us.status === "mastered")
      .map((us) => us.skill_id) || []
  );

  const tabs = [
    {
      value: "overview",
      label: t("tabs.overview"),
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      value: "library",
      label: t("tabs.library"),
      icon: <Library className="h-4 w-4" />,
    },
    {
      value: "learning",
      label: t("tabs.learning"),
      icon: <GraduationCap className="h-4 w-4" />,
    },
    {
      value: "analytics",
      label: t("tabs.analytics"),
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ];

  const handleAddSkill = async (skillId: string) => {
    try {
      await addUserSkill({ skill_id: skillId }).unwrap();
      toast.success(t("messages.skillAdded"));
    } catch {
      toast.error(t("messages.errorAddingSkill"));
    }
  };

  const handleRemoveSkill = async (userSkillId: string) => {
    try {
      await removeUserSkill(userSkillId).unwrap();
      toast.success(t("messages.skillRemoved"));
    } catch {
      toast.error(t("messages.errorRemovingSkill"));
    }
  };

  const handleUpdateStatus = async (userSkillId: string, status: string) => {
    try {
      await updateUserSkill({
        id: userSkillId,
        data: { status: status as "want_to_learn" | "learning" | "practicing" | "mastered" },
      }).unwrap();
      toast.success(t("messages.statusUpdated"));
    } catch {
      toast.error(t("messages.errorUpdatingStatus"));
    }
  };

  const handleStartPath = async (pathId: string) => {
    try {
      await startPath(pathId).unwrap();
      toast.success(t("messages.pathStarted"));
    } catch {
      toast.error(t("messages.errorStartingPath"));
    }
  };

  const handleAddAllPathSkills = async (pathId: string) => {
    try {
      const result = await addAllPathSkills(pathId).unwrap();
      if (result.affected_count > 0) {
        toast.success(t("messages.skillsAddedToList", { count: result.affected_count }));
      } else {
        toast.info(t("messages.allSkillsAlreadyAdded"));
      }
    } catch {
      toast.error(t("messages.errorAddingSkills"));
    }
  };

  const translateCategory = (category: string) => {
    try {
      return t(`categories.${category}`);
    } catch {
      return category;
    }
  };

  const translateDifficulty = (difficulty: string) => {
    try {
      return t(`difficulties.${difficulty}`);
    } catch {
      return difficulty;
    }
  };

  const translateStatus = (status: string) => {
    try {
      return t(`statuses.${status}`);
    } catch {
      return status;
    }
  };

  const hasUserSkills = (userSkillsData?.total || 0) > 0;
  const hasLibrarySkills = (libraryData?.total || 0) > 0;

  // Distribution data for analytics
  const categoryDistributionItems = (analytics?.by_category || []).map(
    (item) => ({
      key: item.category,
      label: translateCategory(item.category),
      value: item.count,
    })
  );

  const statusDistributionItems = (analytics?.by_status || []).map((item) => ({
    key: item.status,
    label: translateStatus(item.status),
    value: item.count,
  }));

  const proficiencyDistributionItems = (analytics?.by_proficiency || []).map(
    (item) => ({
      key: item.proficiency_level,
      label: translateDifficulty(item.proficiency_level),
      value: item.count,
    })
  );

  return (
    <div className="space-y-6">
      <ModuleTabs tabs={tabs} defaultTab="overview">
        {/* Overview Tab - My Skills */}
        <TabsContent value="overview">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatsCard
              title={t("stats.totalSkills")}
              value={analytics?.total_skills || 0}
              icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title={t("stats.mastered")}
              value={analytics?.skills_mastered || 0}
              icon={<Trophy className="h-4 w-4 text-muted-foreground" />}
              variant={
                (analytics?.skills_mastered || 0) > 0 ? "success" : "default"
              }
            />
            <StatsCard
              title={t("stats.learning")}
              value={analytics?.skills_learning || 0}
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title={t("stats.practiceHours")}
              value={`${analytics?.total_practice_hours || 0}h`}
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Streak Card */}
          {analytics?.learning_streak && analytics.learning_streak.current_streak_days > 0 && (
            <Card className="mb-6 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                    <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-orange-900 dark:text-orange-100">
                      {t("streak.current", { days: analytics.learning_streak.current_streak_days })}
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      {t("streak.longest", { days: analytics.learning_streak.longest_streak_days })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("filters.searchSkills")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("filters.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
                {SKILL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {translateCategory(cat.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                {USER_SKILL_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {translateStatus(status.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skills Grid or Empty State */}
          {hasUserSkills || isLoadingUserSkills ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userSkillsData?.items.map((userSkill) => (
                <SkillCard
                  key={userSkill.id}
                  userSkill={userSkill}
                  onUpdateStatus={handleUpdateStatus}
                  onRemove={handleRemoveSkill}
                  translateCategory={translateCategory}
                  translateDifficulty={translateDifficulty}
                  translateStatus={translateStatus}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-12 w-12" />}
              title={t("empty.mySkills.title")}
              description={t("empty.mySkills.description")}
            />
          )}
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("filters.searchLibrary")}
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("filters.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
                {SKILL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {translateCategory(cat.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("filters.difficulty")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allDifficulties")}</SelectItem>
                {SKILL_DIFFICULTIES.map((diff) => (
                  <SelectItem key={diff.value} value={diff.value}>
                    {translateDifficulty(diff.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skills Library Grid */}
          {hasLibrarySkills || isLoadingLibrary ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {libraryData?.items.map((skill) => (
                <LibrarySkillCard
                  key={skill.id}
                  skill={skill}
                  onAdd={handleAddSkill}
                  translateCategory={translateCategory}
                  translateDifficulty={translateDifficulty}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Library className="h-12 w-12" />}
              title={t("empty.library.title")}
              description={t("empty.library.description")}
            />
          )}
        </TabsContent>

        {/* Learning Tab - Paths & Progress */}
        <TabsContent value="learning">
          {/* User's Active Paths */}
          {userPaths && userPaths.items.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t("paths.activePaths")}
              </h3>
              <div className="space-y-4">
                {userPaths.items.map((userPath) => {
                  // Calculate real completion based on mastered skills
                  const pathSkills = userPath.learning_path?.skills || [];
                  const completedSkillsCount = pathSkills.filter(
                    (skill) => masteredSkillIds.has(skill.id)
                  ).length;
                  const totalSkills = pathSkills.length;
                  const realProgress = totalSkills > 0
                    ? Math.round((completedSkillsCount / totalSkills) * 100)
                    : 0;

                  return (
                    <Card key={userPath.id} className="border-primary/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {userPath.learning_path?.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {userPath.learning_path?.description}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {realProgress >= 100
                              ? translateStatus("completed")
                              : translateStatus(userPath.status || "in_progress")}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Progress bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{t("paths.progress")}</span>
                              <span>{realProgress}%</span>
                            </div>
                            <Progress value={realProgress} />
                            <div className="text-xs text-muted-foreground">
                              {completedSkillsCount} / {totalSkills} {t("paths.skillsCompleted")}
                            </div>
                          </div>

                          {/* Add all skills button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleAddAllPathSkills(userPath.learning_path_id)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {t("paths.addAllSkills")}
                          </Button>

                          {/* Skills list */}
                          {pathSkills.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">{t("paths.skillsInPath")}</h4>
                              <div className="space-y-1">
                                {pathSkills.map((skill, index) => {
                                  const isCompleted = masteredSkillIds.has(skill.id);
                                  // Find first non-completed skill as current
                                  const currentIndex = pathSkills.findIndex(
                                    (s) => !masteredSkillIds.has(s.id)
                                  );
                                  const isCurrent = index === currentIndex;
                                  return (
                                    <div
                                      key={skill.id}
                                      className={cn(
                                        "flex items-center gap-2 p-2 rounded-md text-sm",
                                        isCompleted && "bg-green-500/10",
                                        isCurrent && !isCompleted && "bg-primary/10 border border-primary/20",
                                        !isCompleted && !isCurrent && "text-muted-foreground"
                                      )}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                      ) : isCurrent ? (
                                        <Target className="h-4 w-4 text-primary shrink-0" />
                                      ) : (
                                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                                      )}
                                      <span className={cn(isCompleted && "line-through text-muted-foreground")}>
                                        {index + 1}. {skill.name}
                                      </span>
                                      {skill.difficulty && (
                                        <Badge variant="secondary" className="text-xs ml-auto">
                                          {translateDifficulty(skill.difficulty)}
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Paths */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {t("paths.availablePaths")}
            </h3>
            {learningPaths && learningPaths.items.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {learningPaths.items.map((path) => (
                  <LearningPathCard
                    key={path.id}
                    path={path}
                    onStart={handleStartPath}
                    translateCategory={translateCategory}
                    translateDifficulty={translateDifficulty}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<GraduationCap className="h-12 w-12" />}
                title={t("empty.paths.title")}
                description={t("empty.paths.description")}
              />
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("analytics.period")}:
              </span>
              <Select
                value={historyMonths.toString()}
                onValueChange={(value) => setHistoryMonths(parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t("analytics.months3")}</SelectItem>
                  <SelectItem value="6">{t("analytics.months6")}</SelectItem>
                  <SelectItem value="12">{t("analytics.months12")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stats Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title={t("analytics.skillsAdded")}
                value={historyData?.total_skills_added || 0}
                icon={<Plus className="h-4 w-4 text-muted-foreground" />}
              />
              <StatsCard
                title={t("analytics.skillsMastered")}
                value={historyData?.total_skills_mastered || 0}
                icon={<Trophy className="h-4 w-4 text-muted-foreground" />}
              />
              <StatsCard
                title={t("analytics.practiceSessions")}
                value={historyData?.total_practice_sessions || 0}
                icon={<Target className="h-4 w-4 text-muted-foreground" />}
              />
              <StatsCard
                title={t("analytics.avgPracticeHours")}
                value={`${historyData?.avg_monthly_practice_hours || 0}h`}
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                trend={{
                  value: "",
                  label: t("analytics.perMonth"),
                }}
              />
            </div>

            {analytics && analytics.total_skills > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* By Category */}
                <AnalyticsCard title={t("analytics.byCategory")}>
                  <DistributionList
                    items={categoryDistributionItems}
                    emptyMessage={t("analytics.noData")}
                  />
                </AnalyticsCard>

                {/* By Status */}
                <AnalyticsCard title={t("analytics.byStatus")}>
                  <DistributionList
                    items={statusDistributionItems}
                    emptyMessage={t("analytics.noData")}
                  />
                </AnalyticsCard>

                {/* By Proficiency */}
                <AnalyticsCard title={t("analytics.byProficiency")}>
                  <DistributionList
                    items={proficiencyDistributionItems}
                    emptyMessage={t("analytics.noData")}
                  />
                </AnalyticsCard>
              </div>
            )}

            {/* Recent Practice */}
            {analytics?.recent_practice && analytics.recent_practice.length > 0 && (
              <AnalyticsCard title={t("analytics.recentPractice")}>
                <div className="divide-y">
                  {analytics.recent_practice.map((practice, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{practice.skill_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(practice.practiced_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {practice.duration_minutes && (
                          <Badge variant="outline">
                            {practice.duration_minutes} min
                          </Badge>
                        )}
                        {practice.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{practice.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AnalyticsCard>
            )}

            {/* Empty state for analytics */}
            {(!analytics || analytics.total_skills === 0) && (
              <EmptyState
                icon={<BarChart3 className="h-12 w-12" />}
                title={t("analytics.empty.title")}
                description={t("analytics.empty.description")}
              />
            )}
          </div>
        </TabsContent>
      </ModuleTabs>
    </div>
  );
}

// Skill Card Component for user's skills
interface SkillCardProps {
  userSkill: UserSkill;
  onUpdateStatus: (id: string, status: string) => void;
  onRemove: (id: string) => void;
  translateCategory: (category: string) => string;
  translateDifficulty: (difficulty: string) => string;
  translateStatus: (status: string) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

function SkillCard({
  userSkill,
  onUpdateStatus,
  onRemove,
  translateCategory,
  translateDifficulty,
  translateStatus,
  t,
}: SkillCardProps) {
  const skill = userSkill.skill;
  if (!skill) return null;

  const statusColors: Record<string, string> = {
    want_to_learn: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    learning: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    practicing: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300",
    mastered: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {skill.name}
              {userSkill.is_favorite && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
            </CardTitle>
            <div className="flex gap-2 mt-1">
              {skill.category && (
                <Badge variant="outline" className="text-xs">
                  {translateCategory(skill.category)}
                </Badge>
              )}
              {skill.difficulty && (
                <Badge variant="secondary" className="text-xs">
                  {translateDifficulty(skill.difficulty)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {skill.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {skill.description}
          </p>
        )}

        {/* Progress */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span>{t("card.progress")}</span>
            <span>{userSkill.progress_percent}%</span>
          </div>
          <Progress value={userSkill.progress_percent} />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{t("card.practiced", { count: userSkill.times_practiced })}</span>
          <span>{Math.round(userSkill.total_practice_minutes / 60)}h {t("card.total")}</span>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center justify-between">
          <Select
            value={userSkill.status || "want_to_learn"}
            onValueChange={(value) => onUpdateStatus(userSkill.id, value)}
          >
            <SelectTrigger className={cn("w-[140px] h-8 text-xs", statusColors[userSkill.status || "want_to_learn"])}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_SKILL_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {translateStatus(status.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(userSkill.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            {t("card.remove")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Library Skill Card Component
interface LibrarySkillCardProps {
  skill: Skill;
  onAdd: (skillId: string) => void;
  translateCategory: (category: string) => string;
  translateDifficulty: (difficulty: string) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

function LibrarySkillCard({
  skill,
  onAdd,
  translateCategory,
  translateDifficulty,
  t,
}: LibrarySkillCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{skill.name}</CardTitle>
          {skill.is_added && (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t("library.added")}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          {skill.category && (
            <Badge variant="outline" className="text-xs">
              {translateCategory(skill.category)}
            </Badge>
          )}
          {skill.difficulty && (
            <Badge variant="secondary" className="text-xs">
              {translateDifficulty(skill.difficulty)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {skill.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
            {skill.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {skill.estimated_learning_hours && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t("library.estimatedHours", { hours: skill.estimated_learning_hours })}
              </span>
            )}
          </div>
          {!skill.is_added && (
            <Button size="sm" onClick={() => onAdd(skill.id)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("library.addToMySkills")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Learning Path Card Component
interface LearningPathCardProps {
  path: LearningPath;
  onStart: (pathId: string) => void;
  translateCategory: (category: string) => string;
  translateDifficulty: (difficulty: string) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

function LearningPathCard({
  path,
  onStart,
  translateCategory,
  translateDifficulty,
  t,
}: LearningPathCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{path.name}</CardTitle>
          {path.is_featured && (
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              {t("paths.featured")}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 mt-1">
          {path.category && (
            <Badge variant="outline" className="text-xs">
              {translateCategory(path.category)}
            </Badge>
          )}
          {path.difficulty && (
            <Badge variant="secondary" className="text-xs">
              {translateDifficulty(path.difficulty)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {path.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {path.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{path.skill_count} {t("paths.skills")}</span>
          {path.estimated_hours && (
            <span>{t("paths.estimatedHours", { hours: path.estimated_hours })}</span>
          )}
        </div>

        {path.is_started ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t("paths.progress")}</span>
              <span>{path.user_progress_percent}%</span>
            </div>
            <Progress value={path.user_progress_percent} />
          </div>
        ) : (
          <Button className="w-full" onClick={() => onStart(path.id)}>
            {t("paths.startPath")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
