"use client";

import { useMemo } from "react";
import { FileText, Inbox } from "lucide-react";
import { useNotes } from "@/lib/hooks/use-notes";
import { useNotesUIStore } from "@/store/notes-ui.store";
import { NoteCard } from "./note-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Note } from "@studyos/shared/types";

const RECENT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function NotesGrid() {
  const selectedSubjectId = useNotesUIStore((s) => s.selectedSubjectId);
  const searchQuery = useNotesUIStore((s) => s.searchQuery);
  const typeFilter = useNotesUIStore((s) => s.typeFilter);
  const selectedTags = useNotesUIStore((s) => s.selectedTags);
  const sortBy = useNotesUIStore((s) => s.sortBy);
  const selectedNoteIds = useNotesUIStore((s) => s.selectedNoteIds);
  const toggleNoteSelection = useNotesUIStore((s) => s.toggleNoteSelection);

  const { data, isLoading, isError, error } = useNotes({
    subject_id: selectedSubjectId ?? undefined,
    page_size: 100,
  });

  const filteredNotes = useMemo(() => {
    if (!data?.data) return [];

    let notes = data.data as Note[];

    if (typeFilter !== "all") {
      notes = notes.filter((n) => n.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      notes = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)) ||
          extractSearchableText(n.content).toLowerCase().includes(q)
      );
    }

    if (selectedTags.length > 0) {
      notes = notes.filter((n) =>
        selectedTags.every((tag) => n.tags.includes(tag))
      );
    }

    return [...notes].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      const aTime = new Date(sortBy === "updated_at" ? a.updatedAt : a.createdAt).getTime();
      const bTime = new Date(sortBy === "updated_at" ? b.updatedAt : b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [data, typeFilter, searchQuery, selectedTags, sortBy]);

  const recentNotes = useMemo(
    () =>
      filteredNotes.filter(
        (n) => Date.now() - new Date(n.updatedAt).getTime() < RECENT_THRESHOLD_MS
      ),
    [filteredNotes]
  );

  const olderNotes = useMemo(
    () =>
      filteredNotes.filter(
        (n) => Date.now() - new Date(n.updatedAt).getTime() >= RECENT_THRESHOLD_MS
      ),
    [filteredNotes]
  );

  if (isLoading) return <NotesGridSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium text-destructive">Failed to load notes</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Please try again"}
        </p>
      </div>
    );
  }

  if (filteredNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {searchQuery ? (
            <FileText className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Inbox className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <p className="text-sm font-medium">
          {searchQuery ? `No results for "${searchQuery}"` : "No notes yet"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {searchQuery ? "Try a different search term or clear filters" : "Create your first note to get started"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Recent section — only show when no active search */}
      {!searchQuery && recentNotes.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent
          </h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recentNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={selectedNoteIds.has(note.id)}
                onSelect={toggleNoteSelection}
              />
            ))}
          </div>
        </section>
      )}

      {/* All / older notes */}
      {(!searchQuery ? olderNotes : filteredNotes).length > 0 && (
        <section>
          {!searchQuery && recentNotes.length > 0 && (
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Older
            </h2>
          )}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(!searchQuery ? olderNotes : filteredNotes).map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={selectedNoteIds.has(note.id)}
                onSelect={toggleNoteSelection}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NotesGridSkeleton() {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-xl" />
      ))}
    </div>
  );
}

function extractSearchableText(content: string | null): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  } catch {
    return content;
  }
}
