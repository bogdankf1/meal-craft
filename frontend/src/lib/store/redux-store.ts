import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/lib/api/base-api";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Blob responses from export download mutations
        ignoredActions: ["api/executeMutation/fulfilled"],
        ignoredPaths: ["api.mutations"],
      },
    }).concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
