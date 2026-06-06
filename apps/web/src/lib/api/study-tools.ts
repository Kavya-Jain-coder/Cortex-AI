import type { Citation, SearchScope } from "@studyos/shared/types";
import { apiClient } from "./client";

export interface StudyToolPayload {
  query?: string;
  scope?: SearchScope;
  subject_id?: string | null;
  source_ids?: string[];
  count?: number;
}

export interface StudyToolResponse<T = Record<string, unknown>> {
  items: T[];
  citations: Citation[];
  retrievalMeta: Record<string, unknown>;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  difficulty: string;
  sourceHint?: string | null;
}

export interface WeakTopic {
  topic: string;
  confidence: number;
  reason: string;
  nextAction: string;
}

export interface PredictedQuestion {
  question: string;
  topic: string;
  difficulty: string;
  rationale: string;
  sourceHints: string[];
}

export const studyToolsApi = {
  quiz: async (payload: StudyToolPayload): Promise<StudyToolResponse<QuizQuestion>> => {
    const { data } = await apiClient.post("/study-tools/quiz", payload);
    return data;
  },

  weakTopics: async (payload: StudyToolPayload): Promise<StudyToolResponse<WeakTopic>> => {
    const { data } = await apiClient.post("/study-tools/weak-topics", payload);
    return data;
  },

  predictions: async (payload: StudyToolPayload): Promise<StudyToolResponse<PredictedQuestion>> => {
    const { data } = await apiClient.post("/study-tools/predictions", payload);
    return data;
  },
};
