import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi, type AssignmentCreatePayload } from "@/lib/api/assignments";

export const assignmentKeys = {
  all: ["assignments"] as const,
  list: (params: Record<string, unknown>) => [...assignmentKeys.all, "list", params] as const,
};

export function useAssignments(params: { subject_id?: string; type?: "assignment" | "pyq" | "practice" } = {}) {
  return useQuery({
    queryKey: assignmentKeys.list(params),
    queryFn: () => assignmentsApi.list(params),
    staleTime: 30_000,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignmentCreatePayload) => assignmentsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => assignmentsApi.delete(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}
