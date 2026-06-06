import type { Subject } from "@studyos/shared/types";
import { apiClient } from "./client";

export const subjectsApi = {
  list: async (): Promise<Subject[]> => {
    const { data } = await apiClient.get("/subjects");
    return data;
  },

  create: async (payload: { name: string; color: string }): Promise<Subject> => {
    const { data } = await apiClient.post("/subjects", payload);
    return data;
  },

  delete: async (subjectId: string): Promise<void> => {
    await apiClient.delete(`/subjects/${subjectId}`);
  },
};
