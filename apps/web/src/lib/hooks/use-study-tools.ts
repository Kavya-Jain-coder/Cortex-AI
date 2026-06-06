import { useMutation } from "@tanstack/react-query";
import { studyToolsApi, type StudyToolPayload } from "@/lib/api/study-tools";

export function useGenerateQuiz() {
  return useMutation({
    mutationFn: (payload: StudyToolPayload) => studyToolsApi.quiz(payload),
  });
}

export function useWeakTopics() {
  return useMutation({
    mutationFn: (payload: StudyToolPayload) => studyToolsApi.weakTopics(payload),
  });
}

export function usePredictions() {
  return useMutation({
    mutationFn: (payload: StudyToolPayload) => studyToolsApi.predictions(payload),
  });
}
