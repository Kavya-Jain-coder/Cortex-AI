import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api/documents";
import type { Document } from "@studyos/shared/types";

export const documentKeys = {
  all: ["documents"] as const,
  list: (subjectId?: string) => [...documentKeys.all, "list", subjectId] as const,
};

export function useDocuments(subjectId?: string) {
  return useQuery({
    queryKey: documentKeys.list(subjectId),
    queryFn: () => documentsApi.list(subjectId),
    staleTime: 30_000,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, subjectId }: { file: File; subjectId?: string | null }) =>
      documentsApi.upload(file, subjectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => documentsApi.delete(docId),
    onSuccess: (_data, docId) => {
      qc.setQueriesData({ queryKey: documentKeys.all }, (old: Document[] | undefined) =>
        old ? old.filter((d) => d.id !== docId) : old
      );
    },
  });
}
