import type { Assignment, AssignmentType } from "@studyos/shared/types";
import { apiClient } from "./client";

export interface AssignmentCreatePayload {
  title: string;
  type: AssignmentType;
  document_id: string;
  subject_id?: string | null;
  year?: number | null;
  tags?: string[];
}

export const assignmentsApi = {
  list: async (params: { subject_id?: string; type?: AssignmentType } = {}): Promise<Assignment[]> => {
    const { data } = await apiClient.get("/assignments", { params });
    return data;
  },

  create: async (payload: AssignmentCreatePayload): Promise<Assignment> => {
    const { data } = await apiClient.post("/assignments", payload);
    return data;
  },

  delete: async (assignmentId: string): Promise<void> => {
    await apiClient.delete(`/assignments/${assignmentId}`);
  },
};
