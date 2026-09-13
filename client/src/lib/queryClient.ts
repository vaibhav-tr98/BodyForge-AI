import { QueryClient, type Query } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (must be >= maxAge)
    },
  },
});

export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== "success") return false;

  const key = query.queryKey[0];
  if (typeof key !== "string") return false;

  // AI recommendations/transient state
  if (query.queryKey.includes("recommendation") || query.queryKey.includes("ai")) {
    return false;
  }

  const allowlist = [
    "activeWorkout",
    "analytics",
    "exercises",
    "nutrition",
    "progress",
    "workouts",
    "workoutSessions",
    "workoutSession",
  ];

  return allowlist.includes(key);
}