import { baseApi } from "./base-api";

// Types
export type RestrictionType = "allergy" | "dislike";

export interface DietaryRestriction {
  id: string;
  profile_id: string;
  ingredient_name: string;
  restriction_type: RestrictionType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DietaryRestrictionListResponse {
  restrictions: DietaryRestriction[];
  total: number;
}

export interface DietaryRestrictionCreate {
  profile_id: string;
  ingredient_name: string;
  restriction_type: RestrictionType;
  notes?: string;
}

export interface DietaryRestrictionUpdate {
  ingredient_name?: string;
  restriction_type?: RestrictionType;
  notes?: string;
}

export interface BulkDietaryRestrictionCreate {
  profile_id: string;
  restrictions: {
    ingredient_name: string;
    restriction_type: RestrictionType;
    notes?: string;
  }[];
}

export interface ProfileRestrictions {
  profile_id: string;
  profile_name: string;
  profile_color: string | null;
  allergies: string[];
  dislikes: string[];
}

export interface AllRestrictionsResponse {
  profiles: ProfileRestrictions[];
  combined_allergies: string[];
  combined_dislikes: string[];
  all_excluded: string[];
}

// API Slice
export const dietaryRestrictionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List dietary restrictions
    getDietaryRestrictions: builder.query<
      DietaryRestrictionListResponse,
      { profileId?: string; restrictionType?: RestrictionType } | void
    >({
      query: (params) => ({
        url: "/dietary-restrictions",
        params: params
          ? {
              profile_id: params.profileId,
              restriction_type: params.restrictionType,
            }
          : {},
      }),
      providesTags: ["DietaryRestrictions"],
    }),

    // Get all restrictions (grouped by profile, with combined lists)
    getAllRestrictions: builder.query<AllRestrictionsResponse, void>({
      query: () => "/dietary-restrictions/all",
      providesTags: ["DietaryRestrictions"],
    }),

    // Create dietary restriction
    createDietaryRestriction: builder.mutation<DietaryRestriction, DietaryRestrictionCreate>({
      query: (body) => ({
        url: "/dietary-restrictions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["DietaryRestrictions"],
    }),

    // Bulk create dietary restrictions
    bulkCreateDietaryRestrictions: builder.mutation<
      DietaryRestrictionListResponse,
      BulkDietaryRestrictionCreate
    >({
      query: (body) => ({
        url: "/dietary-restrictions/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["DietaryRestrictions"],
    }),

    // Get single dietary restriction
    getDietaryRestriction: builder.query<DietaryRestriction, string>({
      query: (id) => `/dietary-restrictions/${id}`,
      providesTags: (_result, _error, id) => [{ type: "DietaryRestrictions", id }],
    }),

    // Update dietary restriction
    updateDietaryRestriction: builder.mutation<
      DietaryRestriction,
      { id: string; data: DietaryRestrictionUpdate }
    >({
      query: ({ id, data }) => ({
        url: `/dietary-restrictions/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "DietaryRestrictions", id },
        "DietaryRestrictions",
      ],
    }),

    // Delete dietary restriction
    deleteDietaryRestriction: builder.mutation<void, string>({
      query: (id) => ({
        url: `/dietary-restrictions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DietaryRestrictions"],
    }),

    // Delete all restrictions for a profile
    deleteProfileRestrictions: builder.mutation<
      void,
      { profileId: string; restrictionType?: RestrictionType }
    >({
      query: ({ profileId, restrictionType }) => ({
        url: `/dietary-restrictions/profile/${profileId}`,
        method: "DELETE",
        params: restrictionType ? { restriction_type: restrictionType } : {},
      }),
      invalidatesTags: ["DietaryRestrictions"],
    }),
  }),
});

export const {
  useGetDietaryRestrictionsQuery,
  useGetAllRestrictionsQuery,
  useCreateDietaryRestrictionMutation,
  useBulkCreateDietaryRestrictionsMutation,
  useGetDietaryRestrictionQuery,
  useUpdateDietaryRestrictionMutation,
  useDeleteDietaryRestrictionMutation,
  useDeleteProfileRestrictionsMutation,
} = dietaryRestrictionsApi;
