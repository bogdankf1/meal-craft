import { baseApi } from "./base-api";
import type { UIVisibility } from "@/lib/store/user-store";

interface UIPreferencesResponse {
  uiVisibility: UIVisibility;
}

interface UIPreferencesUpdate {
  uiVisibility: Partial<UIVisibility>;
}

export const preferencesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUIPreferences: builder.query<UIPreferencesResponse, void>({
      query: () => "/preferences/ui",
      providesTags: ["UIPreferences"],
    }),

    updateUIPreferences: builder.mutation<UIPreferencesResponse, UIPreferencesUpdate>({
      query: (body) => ({
        url: "/preferences/ui",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["UIPreferences"],
    }),
  }),
});

export const {
  useGetUIPreferencesQuery,
  useUpdateUIPreferencesMutation,
} = preferencesApi;
