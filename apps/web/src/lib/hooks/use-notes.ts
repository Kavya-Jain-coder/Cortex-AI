import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  notesApi,
  type NoteCreatePayload,
  type NoteUpdatePayload,
  type NotesListParams,
} from "@/lib/api/notes";

export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (params: NotesListParams) => [...noteKeys.lists(), params] as const,
  detail: (id: string) => [...noteKeys.all, "detail", id] as const,
};

export function useNotes(params: NotesListParams = {}) {
  return useQuery({
    queryKey: noteKeys.list(params),
    queryFn: () => notesApi.list(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useNote(noteId: string | null) {
  return useQuery({
    queryKey: noteKeys.detail(noteId ?? ""),
    queryFn: () => notesApi.get(noteId!),
    enabled: !!noteId,
    staleTime: 60_000,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NoteCreatePayload) => notesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: NoteUpdatePayload }) =>
      notesApi.update(noteId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(noteKeys.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => notesApi.delete(noteId),
    onMutate: async (noteId) => {
      await qc.cancelQueries({ queryKey: noteKeys.lists() });
      const prev = qc.getQueriesData({ queryKey: noteKeys.lists() });
      // Optimistic removal from all list caches
      qc.setQueriesData({ queryKey: noteKeys.lists() }, (old: any) => {
        if (!old) return old;
        return { ...old, data: old.data.filter((n: any) => n.id !== noteId) };
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}
