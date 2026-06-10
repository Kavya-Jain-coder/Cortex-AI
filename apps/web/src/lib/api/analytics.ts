import type { AnalyticsSummary } from "@studyos/shared/types";
import { apiClient } from "./client";

export const analyticsApi = {
  summary: async (): Promise<AnalyticsSummary> => {
    const { data } = await apiClient.get("/analytics/summary");
    return data;
  },
  recordSession: async (durationMinutes: number, subjectId?: string | null): Promise<void> => {
    await apiClient.post("/analytics/sessions", {
      duration_minutes: durationMinutes,
      subject_id: subjectId,
    });
  },
};
