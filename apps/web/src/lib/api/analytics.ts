import type { AnalyticsSummary } from "@studyos/shared/types";
import { apiClient } from "./client";

export const analyticsApi = {
  summary: async (): Promise<AnalyticsSummary> => {
    const { data } = await apiClient.get("/analytics/summary");
    return data;
  },
};
