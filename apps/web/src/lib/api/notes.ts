import type { Note, PaginatedResponse } from "@studyos/shared/types";
import { apiClient } from "./client";

export interface NotesListParams {
  page?: number;
  page_size?: number;
  subject_id?: string;
}

export interface NoteCreatePayload {
  title: string;
  type: "typed" | "canvas";
  subject_id?: string | null;
  tags?: string[];
}

export interface NoteUpdatePayload {
  title?: string;
  content?: string;
  canvas_data?: string;
  subject_id?: string | null;
  tags?: string[];
}

export const notesApi = {
  list: async (params: NotesListParams = {}): Promise<PaginatedResponse<Note>> => {
    const { data } = await apiClient.get("/notes", { params });
    return data;
  },

  get: async (noteId: string): Promise<Note> => {
    const { data } = await apiClient.get(`/notes/${noteId}`);
    return data;
  },

  create: async (payload: NoteCreatePayload): Promise<Note> => {
    const { data } = await apiClient.post("/notes", payload);
    return data;
  },

  update: async (noteId: string, payload: NoteUpdatePayload): Promise<Note> => {
    const { data } = await apiClient.patch(`/notes/${noteId}`, payload);
    return data;
  },

  delete: async (noteId: string): Promise<void> => {
    await apiClient.delete(`/notes/${noteId}`);
  },
};
