import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi, type ChatRequestPayload } from "@/lib/api/chat";

export const chatKeys = {
  all: ["chat"] as const,
  sessions: () => [...chatKeys.all, "sessions"] as const,
  messages: (sessionId: string) => [...chatKeys.all, "messages", sessionId] as const,
};

export function useChatSessions() {
  return useQuery({
    queryKey: chatKeys.sessions(),
    queryFn: chatApi.listSessions,
    staleTime: 30_000,
  });
}

export function useCreateChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subjectId?: string | null) => chatApi.createSession(subjectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.sessions() });
    },
  });
}

export function useChatMessages(sessionId: string | null) {
  return useQuery({
    queryKey: chatKeys.messages(sessionId ?? ""),
    queryFn: () => chatApi.listMessages(sessionId!),
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: string; payload: ChatRequestPayload }) =>
      chatApi.sendMessage(sessionId, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: chatKeys.messages(variables.sessionId) });
      qc.invalidateQueries({ queryKey: chatKeys.sessions() });
    },
  });
}
