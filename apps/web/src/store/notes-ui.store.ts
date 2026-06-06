import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type NoteTypeFilter = "all" | "typed" | "canvas";
export type NoteSortBy = "updated_at" | "created_at" | "title";

interface NotesUIState {
  // Sidebar
  selectedSubjectId: string | null;
  isSidebarCollapsed: boolean;

  // Filters
  searchQuery: string;
  typeFilter: NoteTypeFilter;
  selectedTags: string[];
  sortBy: NoteSortBy;

  // Upload
  isDragOver: boolean;

  // Selection
  selectedNoteIds: Set<string>;
}

interface NotesUIActions {
  setSelectedSubject: (id: string | null) => void;
  toggleSidebar: () => void;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: NoteTypeFilter) => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  setSortBy: (sort: NoteSortBy) => void;
  setDragOver: (over: boolean) => void;
  toggleNoteSelection: (id: string) => void;
  clearSelection: () => void;
  resetFilters: () => void;
}

const initialState: NotesUIState = {
  selectedSubjectId: null,
  isSidebarCollapsed: false,
  searchQuery: "",
  typeFilter: "all",
  selectedTags: [],
  sortBy: "updated_at",
  isDragOver: false,
  selectedNoteIds: new Set(),
};

export const useNotesUIStore = create<NotesUIState & NotesUIActions>()(
  devtools(
    (set) => ({
      ...initialState,

      setSelectedSubject: (id) =>
        set({ selectedSubjectId: id, selectedNoteIds: new Set() }),

      toggleSidebar: () =>
        set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setTypeFilter: (type) => set({ typeFilter: type }),

      toggleTag: (tag) =>
        set((s) => ({
          selectedTags: s.selectedTags.includes(tag)
            ? s.selectedTags.filter((t) => t !== tag)
            : [...s.selectedTags, tag],
        })),

      clearTags: () => set({ selectedTags: [] }),

      setSortBy: (sort) => set({ sortBy: sort }),

      setDragOver: (over) => set({ isDragOver: over }),

      toggleNoteSelection: (id) =>
        set((s) => {
          const next = new Set(s.selectedNoteIds);
          next.has(id) ? next.delete(id) : next.add(id);
          return { selectedNoteIds: next };
        }),

      clearSelection: () => set({ selectedNoteIds: new Set() }),

      resetFilters: () =>
        set({
          searchQuery: "",
          typeFilter: "all",
          selectedTags: [],
          sortBy: "updated_at",
          selectedSubjectId: null,
        }),
    }),
    { name: "notes-ui" }
  )
);
