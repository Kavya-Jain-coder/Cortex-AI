import type { SearchResult, SearchScope } from "@studyos/shared/types";
import { apiClient } from "./client";

export interface SearchPayload {
  query: string;
  scope?: SearchScope;
  subject_id?: string | null;
  source_ids?: string[];
  limit?: number;
}

export const searchApi = {
  hybrid: async (payload: SearchPayload): Promise<SearchResult[]> => {
    const { data } = await apiClient.post("/search", payload);
    return data;
  },
};
