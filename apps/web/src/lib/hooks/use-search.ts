import { useMutation } from "@tanstack/react-query";
import { searchApi, type SearchPayload } from "@/lib/api/search";

export function useHybridSearch() {
  return useMutation({
    mutationFn: (payload: SearchPayload) => searchApi.hybrid(payload),
  });
}
