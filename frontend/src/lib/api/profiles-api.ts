import { baseApi } from "./base-api";

// Types
export interface Profile {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  avatar_url: string | null;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileListResponse {
  profiles: Profile[];
  total: number;
}

export interface ProfileCreate {
  name: string;
  color?: string;
  avatar_url?: string;
}

export interface ProfileUpdate {
  name?: string;
  color?: string;
  avatar_url?: string;
  is_default?: boolean;
}

// API Slice
export const profilesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List profiles
    getProfiles: builder.query<ProfileListResponse, { includeArchived?: boolean } | void>({
      query: (params) => ({
        url: "/profiles",
        params: params ? { include_archived: params.includeArchived } : {},
      }),
      providesTags: ["Profiles"],
    }),

    // Get single profile
    getProfile: builder.query<Profile, string>({
      query: (id) => `/profiles/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Profiles", id }],
    }),

    // Create profile
    createProfile: builder.mutation<Profile, ProfileCreate>({
      query: (body) => ({
        url: "/profiles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profiles"],
    }),

    // Update profile
    updateProfile: builder.mutation<Profile, { id: string; data: ProfileUpdate }>({
      query: ({ id, data }) => ({
        url: `/profiles/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Profiles", id }, "Profiles"],
    }),

    // Delete (archive) profile
    deleteProfile: builder.mutation<void, string>({
      query: (id) => ({
        url: `/profiles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Profiles"],
    }),

    // Seed default profiles
    seedDefaultProfiles: builder.mutation<ProfileListResponse, void>({
      query: () => ({
        url: "/profiles/seed-defaults",
        method: "POST",
      }),
      invalidatesTags: ["Profiles"],
    }),
  }),
});

export const {
  useGetProfilesQuery,
  useGetProfileQuery,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useDeleteProfileMutation,
  useSeedDefaultProfilesMutation,
} = profilesApi;
