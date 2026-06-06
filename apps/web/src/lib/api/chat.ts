import type { ChatMessage, ChatSession, Citation, SearchScope } from "@studyos/shared/types";
import { apiClient } from "./client";

export interface ChatRequestPayload {
  message: string;
  scope?: SearchScope;
  subject_id?: string | null;
  source_ids?: string[];
}

export interface ChatResponse {
  message: ChatMessage;
  citations: Citation[];
}

export const chatApi = {
  listSessions: async (): Promise<ChatSession[]> => {
    const { data } = await apiClient.get("/chat/sessions");
    return data;
  },

  createSession: async (subjectId?: string | null): Promise<ChatSession> => {
    const { data } = await apiClient.post("/chat/sessions", {
      subject_id: subjectId ?? null,
    });
    return data;
  },

  listMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const { data } = await apiClient.get(`/chat/sessions/${sessionId}/messages`);
    return data;
  },

  sendMessage: async (
    sessionId: string,
    payload: ChatRequestPayload
  ): Promise<ChatResponse> => {
    const { data } = await apiClient.post(
      `/chat/sessions/${sessionId}/messages`,
      payload
    );
    return data;
  },
};
