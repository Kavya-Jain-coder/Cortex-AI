import type { Document } from "@studyos/shared/types";
import { apiClient } from "./client";

export const documentsApi = {
  list: async (subjectId?: string): Promise<Document[]> => {
    const { data } = await apiClient.get("/documents", {
      params: subjectId ? { subject_id: subjectId } : {},
    });
    return data;
  },

  upload: async (file: File, subjectId?: string | null): Promise<Document> => {
    const form = new FormData();
    form.append("file", file);

    const { data } = await apiClient.post("/documents", form, {
      params: subjectId ? { subject_id: subjectId } : {},
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  delete: async (docId: string): Promise<void> => {
    await apiClient.delete(`/documents/${docId}`);
  },
};
