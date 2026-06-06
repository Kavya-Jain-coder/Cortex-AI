import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subjectsApi } from "@/lib/api/subjects";
import type { Subject } from "@studyos/shared/types";

export const subjectKeys = {
  all: ["subjects"] as const,
  list: () => [...subjectKeys.all, "list"] as const,
};

export function useSubjects() {
  return useQuery({
    queryKey: subjectKeys.list(),
    queryFn: subjectsApi.list,
    staleTime: 5 * 60_000,
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      subjectsApi.create(payload),
    onSuccess: (newSubject) => {
      qc.setQueryData<Subject[]>(subjectKeys.list(), (old = []) => [
        ...old,
        newSubject,
      ]);
    },
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: string) => subjectsApi.delete(subjectId),
    onSuccess: (_data, subjectId) => {
      qc.setQueryData<Subject[]>(subjectKeys.list(), (old = []) =>
        old.filter((s) => s.id !== subjectId)
      );
    },
  });
}
