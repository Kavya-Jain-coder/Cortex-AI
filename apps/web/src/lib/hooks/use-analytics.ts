import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: analyticsApi.summary,
    staleTime: 60_000,
  });
}
