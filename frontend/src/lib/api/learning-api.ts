import { baseApi } from "./base-api";

// ============ Enums ============

export type SkillCategory =
  | "knife_skills"
  | "cooking_methods"
  | "baking"
  | "sauces"
  | "preservation"
  | "plating"
  | "temperature_control"
  | "prep_techniques"
  | "flavor_development"
  | "equipment_handling"
  | "other";

export const SKILL_CATEGORIES: { value: SkillCategory; label: string }[] = [
  { value: "knife_skills", label: "Knife Skills" },
  { value: "cooking_methods", label: "Cooking Methods" },
  { value: "baking", label: "Baking" },
  { value: "sauces", label: "Sauces" },
  { value: "preservation", label: "Preservation" },
  { value: "plating", label: "Plating" },
  { value: "temperature_control", label: "Temperature Control" },
  { value: "prep_techniques", label: "Prep Techniques" },
  { value: "flavor_development", label: "Flavor Development" },
  { value: "equipment_handling", label: "Equipment Handling" },
  { value: "other", label: "Other" },
];

export type SkillDifficulty = "beginner" | "intermediate" | "advanced";

export const SKILL_DIFFICULTIES: { value: SkillDifficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "mastered";

export const PROFICIENCY_LEVELS: { value: ProficiencyLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "mastered", label: "Mastered" },
];

export type UserSkillStatus = "want_to_learn" | "learning" | "practicing" | "mastered";

export const USER_SKILL_STATUSES: { value: UserSkillStatus; label: string }[] = [
  { value: "want_to_learn", label: "Want to Learn" },
  { value: "learning", label: "Learning" },
  { value: "practicing", label: "Practicing" },
  { value: "mastered", label: "Mastered" },
];

export type LearningPathStatus = "not_started" | "in_progress" | "completed";

export type LearningPathCategory = "fundamentals" | "cuisine_specific" | "advanced_techniques" | "specialty";

export const LEARNING_PATH_CATEGORIES: { value: LearningPathCategory; label: string }[] = [
  { value: "fundamentals", label: "Fundamentals" },
  { value: "cuisine_specific", label: "Cuisine Specific" },
  { value: "advanced_techniques", label: "Advanced Techniques" },
  { value: "specialty", label: "Specialty" },
];

// ============ Skill Types ============

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  video_url: string | null;
  instructions: string | null;
  tips: string | null;
  estimated_learning_hours: number | null;
  prerequisites: string[] | null;
  related_cuisines: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count: number;
  is_added: boolean;
}

export interface SkillListResponse {
  items: Skill[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SkillFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateSkillInput {
  name: string;
  description?: string | null;
  category?: SkillCategory | null;
  difficulty?: SkillDifficulty;
  video_url?: string | null;
  instructions?: string | null;
  tips?: string | null;
  estimated_learning_hours?: number | null;
  prerequisites?: string[] | null;
  related_cuisines?: string[] | null;
}

export interface UpdateSkillInput {
  name?: string;
  description?: string | null;
  category?: SkillCategory | null;
  difficulty?: SkillDifficulty | null;
  video_url?: string | null;
  instructions?: string | null;
  tips?: string | null;
  estimated_learning_hours?: number | null;
  prerequisites?: string[] | null;
  related_cuisines?: string[] | null;
  is_active?: boolean;
}

// ============ User Skill Types ============

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: string | null;
  status: string | null;
  progress_percent: number;
  times_practiced: number;
  total_practice_minutes: number;
  is_favorite: boolean;
  notes: string | null;
  started_at: string;
  last_practiced_at: string | null;
  mastered_at: string | null;
  created_at: string;
  updated_at: string;
  skill: Skill | null;
}

export interface UserSkillListResponse {
  items: UserSkill[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface UserSkillFilters {
  search?: string;
  category?: string;
  proficiency_level?: string;
  status?: string;
  is_favorite?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateUserSkillInput {
  skill_id: string;
  proficiency_level?: ProficiencyLevel;
  status?: UserSkillStatus;
  is_favorite?: boolean;
  notes?: string | null;
}

export interface UpdateUserSkillInput {
  proficiency_level?: ProficiencyLevel;
  status?: UserSkillStatus;
  progress_percent?: number;
  is_favorite?: boolean;
  notes?: string | null;
}

// ============ Learning Path Types ============

export interface LearningPath {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  estimated_hours: number | null;
  skill_count: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  skills: Skill[];
  is_started: boolean;
  user_progress_percent: number;
}

export interface LearningPathListResponse {
  items: LearningPath[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface LearningPathFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  is_featured?: boolean;
  is_active?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateLearningPathInput {
  name: string;
  description?: string | null;
  category?: LearningPathCategory | null;
  difficulty?: SkillDifficulty;
  estimated_hours?: number | null;
  image_url?: string | null;
  skill_ids: string[];
}

// ============ User Learning Path Types ============

export interface UserLearningPath {
  id: string;
  user_id: string;
  learning_path_id: string;
  status: string | null;
  progress_percent: number;
  skills_completed: number;
  current_skill_index: number;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
  learning_path: LearningPath | null;
}

export interface UserLearningPathListResponse {
  items: UserLearningPath[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface UpdateUserLearningPathInput {
  status?: LearningPathStatus;
  current_skill_index?: number;
}

// ============ Practice Log Types ============

export interface SkillPracticeLog {
  id: string;
  user_id: string;
  skill_id: string;
  duration_minutes: number | null;
  notes: string | null;
  rating: number | null;
  recipe_id: string | null;
  practiced_at: string;
  created_at: string;
  skill: Skill | null;
}

export interface SkillPracticeLogListResponse {
  items: SkillPracticeLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PracticeLogFilters {
  skill_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreatePracticeLogInput {
  skill_id: string;
  duration_minutes?: number | null;
  notes?: string | null;
  rating?: number | null;
  recipe_id?: string | null;
  practiced_at?: string | null;
}

// ============ Bulk Action Types ============

export interface BulkActionResponse {
  success: boolean;
  affected_count: number;
  message: string;
}

// ============ Analytics Types ============

export interface SkillsByCategory {
  category: string;
  count: number;
}

export interface SkillsByProficiency {
  proficiency_level: string;
  count: number;
}

export interface SkillsByStatus {
  status: string;
  count: number;
}

export interface RecentPractice {
  skill_id: string;
  skill_name: string;
  practiced_at: string;
  duration_minutes: number | null;
  rating: number | null;
}

export interface LearningStreak {
  current_streak_days: number;
  longest_streak_days: number;
  last_practice_date: string | null;
}

export interface LearningAnalytics {
  total_skills: number;
  skills_mastered: number;
  skills_learning: number;
  skills_want_to_learn: number;
  total_practice_hours: number;
  total_practice_sessions: number;
  by_category: SkillsByCategory[];
  by_proficiency: SkillsByProficiency[];
  by_status: SkillsByStatus[];
  recent_practice: RecentPractice[];
  learning_streak: LearningStreak;
  paths_in_progress: number;
  paths_completed: number;
  avg_practice_rating: number | null;
}

// ============ History Types ============

export interface MonthlyLearningData {
  month: string;
  month_label: string;
  skills_added: number;
  skills_mastered: number;
  practice_sessions: number;
  practice_minutes: number;
  category_breakdown: Record<string, number>;
}

export interface LearningHistory {
  period_months: number;
  total_skills_added: number;
  total_skills_mastered: number;
  total_practice_sessions: number;
  total_practice_hours: number;
  avg_monthly_practice_hours: number;
  monthly_data: MonthlyLearningData[];
  mastery_trend: Record<string, number>;
}

// ============ API Endpoints ============

export const learningApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ============ Skills Library ============

    // List skills from library
    getSkills: builder.query<SkillListResponse, SkillFilters>({
      query: (params) => ({
        url: "/learning/skills",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Skills" as const,
                id,
              })),
              { type: "Skills", id: "LIST" },
            ]
          : [{ type: "Skills", id: "LIST" }],
    }),

    // Get single skill
    getSkill: builder.query<Skill, string>({
      query: (id) => `/learning/skills/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Skills", id }],
    }),

    // Create skill
    createSkill: builder.mutation<Skill, CreateSkillInput>({
      query: (body) => ({
        url: "/learning/skills",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Skills", id: "LIST" }],
    }),

    // Update skill
    updateSkill: builder.mutation<Skill, { id: string; data: UpdateSkillInput }>({
      query: ({ id, data }) => ({
        url: `/learning/skills/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Skills", id },
        { type: "Skills", id: "LIST" },
      ],
    }),

    // Delete skill
    deleteSkill: builder.mutation<void, string>({
      query: (id) => ({
        url: `/learning/skills/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Skills", id },
        { type: "Skills", id: "LIST" },
      ],
    }),

    // ============ User Skills (My Skills) ============

    // List user's skills
    getUserSkills: builder.query<UserSkillListResponse, UserSkillFilters>({
      query: (params) => ({
        url: "/learning/my-skills",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "UserSkills" as const,
                id,
              })),
              { type: "UserSkills", id: "LIST" },
            ]
          : [{ type: "UserSkills", id: "LIST" }],
    }),

    // Get single user skill
    getUserSkill: builder.query<UserSkill, string>({
      query: (id) => `/learning/my-skills/${id}`,
      providesTags: (_result, _error, id) => [{ type: "UserSkills", id }],
    }),

    // Add skill to user's list
    addUserSkill: builder.mutation<UserSkill, CreateUserSkillInput>({
      query: (body) => ({
        url: "/learning/my-skills",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "UserSkills", id: "LIST" },
        { type: "Skills", id: "LIST" },
        { type: "Learning", id: "ANALYTICS" },
      ],
    }),

    // Bulk add skills
    bulkAddUserSkills: builder.mutation<BulkActionResponse, string[]>({
      query: (skill_ids) => ({
        url: "/learning/my-skills/bulk-add",
        method: "POST",
        body: { skill_ids },
      }),
      invalidatesTags: [
        { type: "UserSkills", id: "LIST" },
        { type: "Skills", id: "LIST" },
        { type: "Learning", id: "ANALYTICS" },
      ],
    }),

    // Update user skill
    updateUserSkill: builder.mutation<UserSkill, { id: string; data: UpdateUserSkillInput }>({
      query: ({ id, data }) => ({
        url: `/learning/my-skills/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "UserSkills", id },
        { type: "UserSkills", id: "LIST" },
        { type: "Learning", id: "ANALYTICS" },
      ],
    }),

    // Remove skill from user's list
    removeUserSkill: builder.mutation<void, string>({
      query: (id) => ({
        url: `/learning/my-skills/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "UserSkills", id },
        { type: "UserSkills", id: "LIST" },
        { type: "Skills", id: "LIST" },
        { type: "Learning", id: "ANALYTICS" },
      ],
    }),

    // Bulk remove skills
    bulkRemoveUserSkills: builder.mutation<BulkActionResponse, string[]>({
      query: (skill_ids) => ({
        url: "/learning/my-skills/bulk-remove",
        method: "POST",
        body: { skill_ids },
      }),
      invalidatesTags: [
        { type: "UserSkills", id: "LIST" },
        { type: "Skills", id: "LIST" },
        { type: "Learning", id: "ANALYTICS" },
      ],
    }),

    // ============ Learning Paths ============

    // List learning paths
    getLearningPaths: builder.query<LearningPathListResponse, LearningPathFilters>({
      query: (params) => ({
        url: "/learning/paths",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "LearningPaths" as const,
                id,
              })),
              { type: "LearningPaths", id: "LIST" },
            ]
          : [{ type: "LearningPaths", id: "LIST" }],
    }),

    // Get single learning path
    getLearningPath: builder.query<LearningPath, string>({
      query: (id) => `/learning/paths/${id}`,
      providesTags: (_result, _error, id) => [{ type: "LearningPaths", id }],
    }),

    // Create learning path
    createLearningPath: builder.mutation<LearningPath, CreateLearningPathInput>({
      query: (body) => ({
        url: "/learning/paths",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "LearningPaths", id: "LIST" }],
    }),

    // ============ User Learning Paths ============

    // List user's learning paths
    getUserLearningPaths: builder.query<UserLearningPathListResponse, { status?: string }>({
      query: (params) => ({
        url: "/learning/my-paths",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "UserLearningPaths" as const,
                id,
              })),
              { type: "UserLearningPaths", id: "LIST" },
            ]
          : [{ type: "UserLearningPaths", id: "LIST" }],
    }),

    // Start learning path
    startLearningPath: builder.mutation<UserLearningPath, string>({
      query: (learning_path_id) => ({
        url: "/learning/my-paths",
        method: "POST",
        body: { learning_path_id },
      }),
      invalidatesTags: [
        { type: "UserLearningPaths", id: "LIST" },
        { type: "LearningPaths", id: "LIST" },
        { type: "Learning", id: "ANALYTICS" },
      ],
    }),

    // Add all skills from a learning path to user's skills
    addAllPathSkills: builder.mutation<BulkActionResponse, string>({
      query: (learning_path_id) => ({
        url: `/learning/my-paths/${learning_path_id}/add-all-skills`,
        method: "POST",
      }),
      invalidatesTags: [
        { type: "UserSkills", id: "LIST" },
        { type: "Skills", id: "LIST" },
        { type: "UserLearningPaths", id: "LIST" },
        { type: "Learning", id: "ANALYTICS" },
      ],
    }),

    // Update user learning path progress
    updateUserLearningPath: builder.mutation<
      UserLearningPath,
      { id: string; data: UpdateUserLearningPathInput }
    >({
      query: ({ id, data }) => ({
        url: `/learning/my-paths/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "UserLearningPaths", id },
        { type: "UserLearningPaths", id: "LIST" },
        { type: "Learning", id: "ANALYTICS" },
      ],
    }),

    // ============ Practice Logs ============

    // List practice logs
    getPracticeLogs: builder.query<SkillPracticeLogListResponse, PracticeLogFilters>({
      query: (params) => ({
        url: "/learning/practice-logs",
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "PracticeLogs" as const,
                id,
              })),
              { type: "PracticeLogs", id: "LIST" },
            ]
          : [{ type: "PracticeLogs", id: "LIST" }],
    }),

    // Log practice session
    logPractice: builder.mutation<SkillPracticeLog, CreatePracticeLogInput>({
      query: (body) => ({
        url: "/learning/practice-logs",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "PracticeLogs", id: "LIST" },
        { type: "UserSkills", id: "LIST" },
        { type: "Learning", id: "ANALYTICS" },
        { type: "Learning", id: "HISTORY" },
      ],
    }),

    // ============ Analytics ============

    // Get learning analytics
    getLearningAnalytics: builder.query<LearningAnalytics, void>({
      query: () => "/learning/analytics",
      providesTags: [{ type: "Learning", id: "ANALYTICS" }],
    }),

    // ============ History ============

    // Get learning history
    getLearningHistory: builder.query<LearningHistory, number>({
      query: (months) => `/learning/history?months=${months}`,
      providesTags: [{ type: "Learning", id: "HISTORY" }],
    }),
  }),
});

export const {
  // Skills Library
  useGetSkillsQuery,
  useGetSkillQuery,
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
  // User Skills
  useGetUserSkillsQuery,
  useGetUserSkillQuery,
  useAddUserSkillMutation,
  useBulkAddUserSkillsMutation,
  useUpdateUserSkillMutation,
  useRemoveUserSkillMutation,
  useBulkRemoveUserSkillsMutation,
  // Learning Paths
  useGetLearningPathsQuery,
  useGetLearningPathQuery,
  useCreateLearningPathMutation,
  // User Learning Paths
  useGetUserLearningPathsQuery,
  useStartLearningPathMutation,
  useUpdateUserLearningPathMutation,
  useAddAllPathSkillsMutation,
  // Practice Logs
  useGetPracticeLogsQuery,
  useLogPracticeMutation,
  // Analytics
  useGetLearningAnalyticsQuery,
  // History
  useGetLearningHistoryQuery,
} = learningApi;
