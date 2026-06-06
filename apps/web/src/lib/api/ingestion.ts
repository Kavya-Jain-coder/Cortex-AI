import { apiClient } from "./client";

export interface IngestionStatus {
  id: string;
  status: string;
  pageCount: number | null;
  chunkCount: number | null;
}

export interface ReindexResult {
  docId: string;
  chunkCount: number;
  pageCount: number;
  elapsedMs: number;
  status: string;
}

export const ingestionApi = {
  status: async (docId: string): Promise<IngestionStatus> => {
    const { data } = await apiClient.get(`/ingestion/documents/${docId}/status`);
    return data;
  },

  reindex: async (docId: string): Promise<ReindexResult> => {
    const { data } = await apiClient.post(`/ingestion/documents/${docId}/reindex`);
    return data;
  },
};
