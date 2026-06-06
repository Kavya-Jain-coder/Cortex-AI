import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ingestionApi } from "@/lib/api/ingestion";
import { documentKeys } from "./use-documents";

export function useIngestionStatus(docId: string, enabled = true) {
  return useQuery({
    queryKey: ["ingestion", docId],
    queryFn: () => ingestionApi.status(docId),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 3000 : false;
    },
  });
}

export function useReindexDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => ingestionApi.reindex(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: documentKeys.all });
      qc.invalidateQueries({ queryKey: ["ingestion"] });
    },
  });
}
