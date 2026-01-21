import { baseApi } from "./base-api";
import type {
  OnboardingStepId,
  OnboardingStepState,
  OnboardingStepStatus,
} from "@/lib/store/onboarding-store";

interface OnboardingStateResponse {
  is_dismissed: boolean;
  steps: Record<string, OnboardingStepState>;
}

interface OnboardingStatusResponse {
  steps: Record<string, boolean>;
}

interface UpdateStepRequest {
  step_id: OnboardingStepId;
  status: OnboardingStepStatus;
}

interface DismissRequest {
  is_dismissed: boolean;
}

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get onboarding state (user's saved progress)
    getOnboardingState: builder.query<OnboardingStateResponse, void>({
      query: () => "/preferences/onboarding",
      providesTags: ["Onboarding"],
    }),

    // Update a single step status
    updateOnboardingStep: builder.mutation<
      OnboardingStateResponse,
      UpdateStepRequest
    >({
      query: (body) => ({
        url: "/preferences/onboarding/step",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Onboarding"],
    }),

    // Dismiss or show onboarding
    dismissOnboarding: builder.mutation<OnboardingStateResponse, DismissRequest>(
      {
        query: (body) => ({
          url: "/preferences/onboarding/dismiss",
          method: "PUT",
          body,
        }),
        invalidatesTags: ["Onboarding"],
      }
    ),

    // Get derived status based on actual user data
    getOnboardingDerivedStatus: builder.query<OnboardingStatusResponse, void>({
      query: () => "/preferences/onboarding/status",
      // Don't cache this - we want fresh data on every poll
      providesTags: [],
    }),
  }),
});

export const {
  useGetOnboardingStateQuery,
  useUpdateOnboardingStepMutation,
  useDismissOnboardingMutation,
  useGetOnboardingDerivedStatusQuery,
  useLazyGetOnboardingDerivedStatusQuery,
} = onboardingApi;
